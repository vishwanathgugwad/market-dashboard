const { getAdvanceDeclineLatestSlot, getAdvanceDecline, ValidationError } = require("./advanceDecline");
const { getLiveIndexQuote } = require("./liveIndexQuote");

const LIVE_TTL_MS = 4000;
const DAY_TTL_MS = 60_000;

const INDEX_NAME_TO_KEY = {
  NIFTY50: "nifty50",
  BANKNIFTY: "banknifty",
  FINNIFTY: "finnifty",
};

const moodCache = new Map();

function debugLog(...args) {
  if (process.env.DEBUG_MOOD === "1") {
    console.debug("[marketMood]", ...args);
  }
}

function cacheGet(key) {
  const entry = moodCache.get(key);
  if (!entry) return null;
  if (entry.data && entry.expiresAt > Date.now()) return entry.data;
  return null;
}

function cacheGetInflight(key) {
  const entry = moodCache.get(key);
  return entry?.inflight || null;
}

function cacheSetInflight(key, inflight) {
  const existing = moodCache.get(key);
  moodCache.set(key, {
    data: existing?.data || null,
    expiresAt: existing?.expiresAt || 0,
    inflight,
  });
}

function cacheSetData(key, data, ttlMs) {
  moodCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    inflight: null,
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeAdr({ advances, declines, unchanged, no_data }) {
  const safeDeclines = Math.max(1, declines);
  const total = advances + declines + unchanged;
  const pctAdv = total > 0 ? advances / Math.max(1, total) : 0;

  return {
    value: advances / safeDeclines,
    spread: advances - declines,
    pctAdv,
    advances,
    declines,
    unchanged,
    no_data: no_data || 0,
  };
}

function labelForScore(score) {
  if (score === null || score === undefined) return null;
  if (score >= 60) return "Risk-On";
  if (score >= 20) return "Bullish";
  if (score >= -19) return "Neutral";
  if (score >= -59) return "Bearish";
  return "Risk-Off";
}

function computeMood({ adrValue, spread, pctAdv, changePct }) {
  if (adrValue === null || adrValue === undefined) {
    return {
      score: null,
      label: null,
      components: null,
    };
  }

  const baseBreadth = clamp((adrValue - 1) * 50, -60, 60);
  const spreadAdj = clamp(spread * 1.2, -25, 25);
  const pctAdvAdj = clamp((pctAdv - 0.5) * 80, -20, 20);
  const priceAdj = Number.isFinite(changePct) ? clamp(changePct * 35, -15, 15) : 0;

  const finalScore = Math.round(clamp(baseBreadth + spreadAdj + pctAdvAdj + priceAdj, -100, 100));

  return {
    score: finalScore,
    label: labelForScore(finalScore),
    components: {
      baseBreadth,
      spreadAdj,
      pctAdvAdj,
      priceAdj,
    },
  };
}

async function getIndexChangePct(indexName) {
  const indexKey = INDEX_NAME_TO_KEY[indexName];
  if (!indexKey) return null;

  try {
    const quote = await getLiveIndexQuote({ indexKey });
    return Number.isFinite(quote?.changePct) ? quote.changePct : null;
  } catch (err) {
    debugLog("Price quote unavailable", err?.message || err);
    return null;
  }
}

async function getMarketMoodLive({ indexName, interval, concurrency }) {
  const livePayload = await getAdvanceDeclineLatestSlot({ indexName, interval, concurrency });

  const window = livePayload.window || {};
  const cacheKey = `live:${livePayload.indexName}:${interval}:${window.date}:${window.fromTime}:${window.toTime}`;

  const cached = cacheGet(cacheKey);
  if (cached) {
    debugLog("cache hit", cacheKey);
    return cached;
  }

  const inflight = cacheGetInflight(cacheKey);
  if (inflight) return inflight;

  const inflightPromise = (async () => {
    const summary = livePayload.summary || {
      advances: 0,
      declines: 0,
      unchanged: 0,
      no_data: 0,
    };

    if (!livePayload.slotCompleted) {
      const payload = {
        indexName: livePayload.indexName,
        interval: livePayload.interval,
        window: livePayload.window,
        slotCompleted: false,
        adr: {
          value: null,
          spread: null,
          pctAdv: null,
          advances: summary.advances,
          declines: summary.declines,
          unchanged: summary.unchanged,
          no_data: summary.no_data,
        },
        mood: {
          score: null,
          label: null,
          components: null,
        },
        message: livePayload.message,
      };

      cacheSetData(cacheKey, payload, LIVE_TTL_MS);
      return payload;
    }

    const adr = computeAdr(summary);
    const changePct = await getIndexChangePct(livePayload.indexName);
    const mood = computeMood({
      adrValue: adr.value,
      spread: adr.spread,
      pctAdv: adr.pctAdv,
      changePct,
    });

    const payload = {
      indexName: livePayload.indexName,
      interval: livePayload.interval,
      window: livePayload.window,
      slotCompleted: true,
      adr,
      mood,
      message: livePayload.message,
    };

    cacheSetData(cacheKey, payload, LIVE_TTL_MS);
    return payload;
  })();

  cacheSetInflight(cacheKey, inflightPromise);

  try {
    const data = await inflightPromise;
    return data;
  } catch (err) {
    moodCache.delete(cacheKey);
    throw err;
  }
}

async function getMarketMoodByDay({ indexName, date, interval, fromTime, toTime, concurrency }) {
  if (!date) {
    throw new ValidationError("date is required (YYYY-MM-DD).");
  }

  const safeFrom = fromTime || "09:15:00";
  const safeTo = toTime || "15:30:00";
  const cacheKey = `day:${indexName}:${interval}:${date}:${safeFrom}:${safeTo}`;

  const cached = cacheGet(cacheKey);
  if (cached) {
    debugLog("cache hit", cacheKey);
    return cached;
  }

  const inflight = cacheGetInflight(cacheKey);
  if (inflight) return inflight;

  const inflightPromise = (async () => {
    const payload = await getAdvanceDecline({
      indexName,
      date,
      fromTime: safeFrom,
      toTime: safeTo,
      interval,
      concurrency,
    });

    const totals = payload.rows.reduce(
      (acc, row) => {
        acc.advances += row.green || 0;
        acc.declines += row.red || 0;
        acc.unchanged += row.unchanged || 0;
        return acc;
      },
      { advances: 0, declines: 0, unchanged: 0 }
    );

    const adr = computeAdr({
      advances: totals.advances,
      declines: totals.declines,
      unchanged: totals.unchanged,
      no_data: 0,
    });

    const mood = computeMood({
      adrValue: adr.value,
      spread: adr.spread,
      pctAdv: adr.pctAdv,
      changePct: null,
    });

    const result = {
      indexName: payload.indexName,
      interval: payload.timeframe.interval,
      window: {
        date: payload.date,
        fromTime: payload.timeframe.fromTime,
        toTime: payload.timeframe.toTime,
      },
      slotCompleted: true,
      adr,
      mood,
    };

    cacheSetData(cacheKey, result, DAY_TTL_MS);
    return result;
  })();

  cacheSetInflight(cacheKey, inflightPromise);

  try {
    const data = await inflightPromise;
    return data;
  } catch (err) {
    moodCache.delete(cacheKey);
    throw err;
  }
}

module.exports = {
  getMarketMoodLive,
  getMarketMoodByDay,
  ValidationError,
};
