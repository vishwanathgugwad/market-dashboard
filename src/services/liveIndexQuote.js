const { DateTime } = require("luxon");

const { getKiteClient } = require("./kiteClient");
const { getIndexInstrumentToken, getKiteInstrumentsCached } = require("./indexConstituents");

const INDEX_CONFIG = {
  nifty50: { indexKey: "nifty50", indexName: "NIFTY 50", kiteKey: "NIFTY50" },
  banknifty: { indexKey: "banknifty", indexName: "NIFTY BANK", kiteKey: "BANKNIFTY" },
  finnifty: { indexKey: "finnifty", indexName: "FINNIFTY", kiteKey: "FINNIFTY" },
};

const QUOTE_CACHE_TTL_MS = 4000;
const quoteCache = new Map();

function getIndexConfig(indexKey) {
  const normalized = String(indexKey || "").toLowerCase();
  return INDEX_CONFIG[normalized] || null;
}

function cacheGet(key) {
  const entry = quoteCache.get(key);
  if (!entry) return null;
  if (entry.data && entry.expiresAt > Date.now()) return entry.data;
  return null;
}

function cacheSet(key, data, ttlMs) {
  quoteCache.set(key, { data, expiresAt: Date.now() + ttlMs, inflight: null });
}

async function resolveInstrumentByToken(token) {
  const instruments = await getKiteInstrumentsCached();
  const match = instruments.find((row) => Number(row.instrument_token) === Number(token));
  if (!match) {
    throw new Error(`Unable to resolve instrument details for token ${token}.`);
  }
  return {
    tradingsymbol: match.tradingsymbol,
    exchange: match.exchange || "NSE",
  };
}

function toIstIso(value) {
  if (!value) return DateTime.now().setZone("Asia/Kolkata").toISO();
  const dt = value instanceof Date ? DateTime.fromJSDate(value) : DateTime.fromISO(String(value));
  return dt.setZone("Asia/Kolkata").toISO();
}

function buildPayload({ indexKey, indexName, timestamp, ltp, prevClose, open, high, low }) {
  if (!Number.isFinite(ltp) || !Number.isFinite(prevClose)) {
    throw new Error("Missing quote values for change computation.");
  }

  const change = ltp - prevClose;
  const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  return {
    indexKey,
    indexName,
    timestamp: toIstIso(timestamp),
    ltp,
    prevClose,
    open,
    high,
    low,
    change,
    changePct,
  };
}

async function fetchQuoteFromKite({ kite, instrument, indexKey, indexName }) {
  if (typeof kite.getQuote !== "function") return null;

  const quoteKey = `${instrument.exchange}:${instrument.tradingsymbol}`;
  const quotes = await kite.getQuote([quoteKey]);
  const quote = quotes?.[quoteKey];

  if (!quote || !Number.isFinite(quote.last_price)) return null;

  const ohlc = quote.ohlc || {};

  if (!Number.isFinite(ohlc.close) || !Number.isFinite(ohlc.open)) {
    return null;
  }

  return buildPayload({
    indexKey,
    indexName,
    timestamp: quote.timestamp || new Date(),
    ltp: Number(quote.last_price),
    prevClose: Number(ohlc.close),
    open: Number(ohlc.open),
    high: Number(ohlc.high),
    low: Number(ohlc.low),
  });
}

function normalizeDayCandleDate(candle) {
  if (!candle?.date) return null;
  return DateTime.fromJSDate(candle.date).setZone("Asia/Kolkata");
}

async function fetchQuoteFromHistorical({ kite, token, indexKey, indexName }) {
  const now = DateTime.now().setZone("Asia/Kolkata");
  const marketOpen = now.set({ hour: 9, minute: 15, second: 0, millisecond: 0 });
  const intradayFrom = marketOpen;

  const candles = await kite.getHistoricalData(
    token,
    "minute",
    intradayFrom.toJSDate(),
    now.toJSDate(),
    false,
    false
  );

  if (!candles || candles.length === 0) {
    throw new Error("No intraday candle data available.");
  }

  const first = candles[0];
  const last = candles[candles.length - 1];
  const high = Math.max(...candles.map((c) => Number(c.high)));
  const low = Math.min(...candles.map((c) => Number(c.low)));

  const lookbackStart = now.minus({ days: 10 }).startOf("day");
  const dayCandles = await kite.getHistoricalData(
    token,
    "day",
    lookbackStart.toJSDate(),
    now.endOf("day").toJSDate(),
    false,
    false
  );

  const todayStart = now.startOf("day");
  const previousDayCandles = (dayCandles || [])
    .map((c) => ({ ...c, dt: normalizeDayCandleDate(c) }))
    .filter((c) => c.dt && c.dt < todayStart)
    .sort((a, b) => a.dt.toMillis() - b.dt.toMillis());

  const prevCloseCandle = previousDayCandles[previousDayCandles.length - 1];
  if (!prevCloseCandle || !Number.isFinite(prevCloseCandle.close)) {
    throw new Error("Previous close candle unavailable.");
  }

  return buildPayload({
    indexKey,
    indexName,
    timestamp: last.date || new Date(),
    ltp: Number(last.close),
    prevClose: Number(prevCloseCandle.close),
    open: Number(first.open),
    high,
    low,
  });
}

async function getLiveIndexQuote({ indexKey }) {
  const config = getIndexConfig(indexKey);
  if (!config) {
    throw new Error("Unsupported index route.");
  }

  const cached = cacheGet(config.indexKey);
  if (cached) return cached;

  const existing = quoteCache.get(config.indexKey);
  if (existing?.inflight) {
    return existing.inflight;
  }

  const inflight = (async () => {
    const token = await getIndexInstrumentToken(config.kiteKey);
    const kite = getKiteClient();
    const instrument = await resolveInstrumentByToken(token);

    let payload = null;

    try {
      payload = await fetchQuoteFromKite({ kite, instrument, indexKey: config.indexKey, indexName: config.indexName });
    } catch (err) {
      console.warn("Failed to fetch quote via getQuote", err?.message || err);
    }

    if (!payload) {
      payload = await fetchQuoteFromHistorical({
        kite,
        token,
        indexKey: config.indexKey,
        indexName: config.indexName,
      });
    }

    cacheSet(config.indexKey, payload, QUOTE_CACHE_TTL_MS);
    return payload;
  })();

  quoteCache.set(config.indexKey, {
    data: cached || null,
    expiresAt: cached ? Date.now() + QUOTE_CACHE_TTL_MS : 0,
    inflight,
  });

  try {
    const data = await inflight;
    return data;
  } catch (err) {
    quoteCache.delete(config.indexKey);
    throw err;
  }
}

module.exports = {
  getLiveIndexQuote,
};
