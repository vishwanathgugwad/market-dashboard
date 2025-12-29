const { loadInstruments } = require("./instruments");
const { setTimeout: sleep } = require("timers/promises");
const indexTokenCache = new Map(); // key -> { token, expiresAt }


const INDEX_NAME_TO_NSE = {
  NIFTY50: "NIFTY 50",
  BANKNIFTY: "NIFTY BANK",
  FINNIFTY: "NIFTY FINANCIAL SERVICES",
};

const KITE_INSTRUMENTS_TTL_MS = 6 * 60 * 60 * 1000;
const CONSTITUENTS_TTL_MS = 6 * 60 * 60 * 1000; 
const NSE_COOKIE_TTL_MS = 2 * 60 * 60 * 1000;

const instrumentsCache = {
  data: null,
  expiresAt: 0,
  inflight: null,
};

const nseCookieCache = {
  cookie: null,
  expiresAt: 0,
  inflight: null,
};

const constituentsCache = new Map();

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchJsonWithRetry(url, options = {}, { retries = 2, timeoutMs = 20000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, options, timeoutMs);
    } catch (err) {
      lastErr = err;
      // simple backoff
      await sleep(500 * (attempt + 1));
    }
  }
  throw lastErr;
}

function getSupportedIndexName(indexName) {
  const normalized = String(indexName || "").toUpperCase();
  if (!INDEX_NAME_TO_NSE[normalized]) {
    throw new Error(
      `Unsupported index name: ${indexName}. Supported: ${Object.keys(INDEX_NAME_TO_NSE).join(
        ", "
      )}`
    );
  }
  return normalized;
}

async function withTimeout(promise, ms, label = "timeout") {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms)),
  ]);
}

async function getNseCookieHeader() {
  const now = Date.now();
  if (nseCookieCache.cookie && nseCookieCache.expiresAt > now) {
    return nseCookieCache.cookie;
  }

  if (nseCookieCache.inflight) {
    return nseCookieCache.inflight;
  }

  nseCookieCache.inflight = (async () => {
    const res = await fetch("https://www.nseindia.com/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to initialize NSE cookies. Status: ${res.status}`);
    }

    const setCookie = res.headers.getSetCookie?.() || res.headers.raw?.()["set-cookie"] || [];
    const cookieHeader = Array.isArray(setCookie)
      ? setCookie.map((cookie) => cookie.split(";")[0]).join("; ")
      : "";

    nseCookieCache.cookie = cookieHeader;
    nseCookieCache.expiresAt = Date.now() + NSE_COOKIE_TTL_MS;
    nseCookieCache.inflight = null;

    return cookieHeader;
  })();

  return nseCookieCache.inflight;
}

function buildNseHeaders({ referer, cookieHeader } = {}) {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: referer || "https://www.nseindia.com/",
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
  };
}
async function fetchNseConstituents(indexName) {
  const normalized = getSupportedIndexName(indexName);
  const cached = constituentsCache.get(normalized);
  const now = Date.now();

  // ✅ serve fresh cache
  if (cached?.data && cached.expiresAt > now) {
    return cached.data;
  }

  // ✅ de-dupe in-flight
  if (cached?.inflight) {
    return cached.inflight;
  }

  const nseIndexName = INDEX_NAME_TO_NSE[normalized];
  const url = `https://www.nseindia.com/api/equity-stockIndices?index=${encodeURIComponent(nseIndexName)}`;
  const referer = `https://www.nseindia.com/market-data/live-equity-market?symbol=${encodeURIComponent(nseIndexName)}`;

  // NSE is slow/unreliable → allow longer end-to-end time
  const TOTAL_TIMEOUT_MS = 35_000; // ✅ overall cap
  const FETCH_TIMEOUT_MS = 25_000; // ✅ per attempt
  const RETRIES = 3;               // ✅ more retries

  const inflight = (async () => {
    try {
      let cookieHeader = await getNseCookieHeader();

      const doFetch = async () =>
        fetchJsonWithRetry(
          url,
          { headers: buildNseHeaders({ referer, cookieHeader }) },
          { retries: RETRIES, timeoutMs: FETCH_TIMEOUT_MS }
        );

      // ✅ hard timeout around the whole operation
      let response = await withTimeout(doFetch(), TOTAL_TIMEOUT_MS, "NSE constituents timeout");

      // cookie expired / blocked → refresh cookie once and retry
      if (response.status === 401 || response.status === 403) {
        nseCookieCache.cookie = null;
        cookieHeader = await getNseCookieHeader();

        response = await withTimeout(
          fetchJsonWithRetry(
            url,
            { headers: buildNseHeaders({ referer, cookieHeader }) },
            { retries: RETRIES, timeoutMs: FETCH_TIMEOUT_MS }
          ),
          TOTAL_TIMEOUT_MS,
          "NSE constituents timeout"
        );
      }

      if (!response.ok) {
        throw new Error(`NSE HTTP ${response.status}`);
      }

      const payload = await response.json();
      const symbols = (payload?.data || []).map((row) => row.symbol).filter(Boolean);

      if (!symbols.length) {
        throw new Error("NSE returned empty constituents list");
      }

      // ✅ store NEW symbols in cache
      constituentsCache.set(normalized, {
        data: symbols,
        expiresAt: Date.now() + CONSTITUENTS_TTL_MS,
        inflight: null,
      });

      return symbols;
    } catch (err) {
      // ✅ clear inflight so next request can retry (important)
      constituentsCache.set(normalized, {
        data: cached?.data || null,
        expiresAt: cached?.expiresAt || 0,
        inflight: null,
      });

      // ✅ fallback to stale data if available
      const stale = cached?.data;
      if (stale && stale.length) {
        console.warn(
          `NSE fetch failed for ${normalized}. Using stale constituents.`,
          err?.message || err
        );
        return stale;
      }

      throw err;
    }
  })();

  // ✅ mark inflight (preserve stale data if exists)
  constituentsCache.set(normalized, {
    data: cached?.data || null,
    expiresAt: cached?.expiresAt || 0,
    inflight,
  });

  return inflight;
}



async function getKiteInstrumentsCached() {
  const now = Date.now();
  if (instrumentsCache.data && instrumentsCache.expiresAt > now) {
    return instrumentsCache.data;
  }

  if (instrumentsCache.inflight) {
    return instrumentsCache.inflight;
  }

  instrumentsCache.inflight = (async () => {
    const data = await loadInstruments();
    instrumentsCache.data = data;
    instrumentsCache.expiresAt = Date.now() + KITE_INSTRUMENTS_TTL_MS;
    instrumentsCache.inflight = null;
    return data;
  })();

  return instrumentsCache.inflight;
}

async function getIndexInstrumentToken(indexName) {
  const normalized = getSupportedIndexName(indexName);

  const cached = indexTokenCache.get(normalized);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.token;

  const instruments = await getKiteInstrumentsCached();
  const nseIndexName = INDEX_NAME_TO_NSE[normalized];
  const target = String(nseIndexName).toUpperCase();

  let found = null;

  for (const row of instruments) {
    if (row.exchange !== "NSE") continue;

    const instrumentType = String(row.instrument_type || "").toUpperCase();
    const segment = String(row.segment || "").toUpperCase();
    const looksLikeIndex = instrumentType === "INDEX" || segment === "INDICES";
    if (!looksLikeIndex) continue;

    const name = String(row.name || "").toUpperCase();
    const ts = String(row.tradingsymbol || "").toUpperCase();

    if (name === target || ts === target) {
      found = row;
      break;
    }
  }

  if (!found) {
    for (const row of instruments) {
      if (row.exchange !== "NSE") continue;
      const name = String(row.name || "").toUpperCase();
      const ts = String(row.tradingsymbol || "").toUpperCase();
      if (name === target || ts === target) {
        found = row;
        break;
      }
    }
  }

  if (!found) {
    throw new Error(`Index instrument not found in Kite instruments dump for ${normalized} (${nseIndexName}).`);
  }

  const token = Number(found.instrument_token);
  if (!Number.isFinite(token)) {
    throw new Error(`Invalid instrument_token for ${normalized} (${nseIndexName}): ${found.instrument_token}`);
  }

  indexTokenCache.set(normalized, {
    token,
    expiresAt: Date.now() + KITE_INSTRUMENTS_TTL_MS,
  });

  console.log(`[INDEX TOKEN] ${normalized} -> ${token}`);
  return token;
}


async function getIndexConstituents(indexName) {
  // Kite Connect instruments dump excludes index membership, so we must pull
  // constituents from NSE (or another external source) before mapping.
  const normalized = getSupportedIndexName(indexName);
  const [symbols, instruments] = await Promise.all([
    fetchNseConstituents(normalized),
    getKiteInstrumentsCached(),
  ]);

  const equityMap = new Map();
  for (const row of instruments) {
    if (row.exchange !== "NSE") continue;
    if (row.instrument_type !== "EQ") continue;
    equityMap.set(row.tradingsymbol, Number(row.instrument_token));
  }

  const mapped = [];
  for (const symbol of symbols) {
    const token = equityMap.get(symbol);
    if (!token) {
      console.warn(`Missing NSE EQ instrument token for ${symbol} (${normalized}).`);
      continue;
    }

    mapped.push({
      tradingsymbol: symbol,
      instrument_token: token,
      exchange: "NSE",
    });
  }

  return mapped;
}

if (require.main === module) {
  getIndexConstituents("NIFTY50")
    .then((rows) => {
      console.log("NIFTY50 tokens:", rows);
    })
    .catch((error) => {
      console.error("Failed to load NIFTY50 constituents:", error);
      process.exitCode = 1;
    });
}

module.exports = {
  fetchNseConstituents,
  getIndexConstituents,
  getKiteInstrumentsCached,
  getIndexInstrumentToken
};
