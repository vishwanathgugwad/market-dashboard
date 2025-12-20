const { getKiteClient } = require("./kiteClient");

const TF_MAP = {
  "5m": { kite: "5minute", minutes: 5 },
  "15m": { kite: "15minute", minutes: 15 },
  "1h": { kite: "60minute", minutes: 60 },
  day: { kite: "day", minutes: 24 * 60 },
};

const candleCache = new Map(); // key => candles
const breadthCache = new Map(); // key => { expiresAt, data }

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_CONCURRENCY = 6;

const IST_TIMEZONE = "Asia/Kolkata";
const istDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const toDateOnly = (value) => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (!d || Number.isNaN(d.getTime())) return "";
  return istDateFormatter.format(d);
};

const istStartOfDay = (dateStr) => new Date(`${dateStr}T00:00:00+05:30`);
const istEndOfDay = (dateStr) => new Date(`${dateStr}T23:59:59+05:30`);

const isWeekend = (date) => {
  const d = date.getDay();
  return d === 0 || d === 6;
};

const formatDateStr = (d) => d.toISOString().slice(0, 10);

function buildSyntheticTradingDays(limit = 30) {
  const days = [];
  let cursor = new Date();

  while (days.length < limit) {
    if (!isWeekend(cursor)) days.push(formatDateStr(cursor));
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  return days;
}

function cacheGet(key) {
  const entry = breadthCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt > Date.now()) return entry.data;
  breadthCache.delete(key);
  return null;
}

function cacheSet(key, data, ttlMs = CACHE_TTL_MS) {
  breadthCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function normalizeTf(tf) {
  const v = (tf || "").toLowerCase();
  if (v === "5minute" || v === "5m") return "5m";
  if (v === "15minute" || v === "15m") return "15m";
  if (v === "60minute" || v === "60m" || v === "1h" || v === "1hr") return "1h";
  if (v === "day" || v === "1d") return "day";
  return "5m";
}

async function runWithLimit(items, limit, worker) {
  const results = [];
  let index = 0;

  async function runner() {
    while (index < items.length) {
      const current = index++;
      try {
        results[current] = await worker(items[current], current);
      } catch (err) {
        results[current] = null;
      }
    }
  }

  const workers = Array(Math.min(limit, items.length))
    .fill(0)
    .map(() => runner());

  await Promise.all(workers);
  return results;
}

async function fetchHistoricalCandles(token, dateStr, tf) {
  const tfKey = normalizeTf(tf);
  const mapping = TF_MAP[tfKey];
  if (!mapping) throw new Error(`Unsupported timeframe '${tf}'`);

  const cacheKey = `${token}:${dateStr}:${tfKey}`;
  if (candleCache.has(cacheKey)) {
    return candleCache.get(cacheKey);
  }

  const kite = getKiteClient();
  const from = istStartOfDay(dateStr);
  const to = istEndOfDay(dateStr);
  const candles = await kite.getHistoricalData(token, from, to, mapping.kite);

  candleCache.set(cacheKey, candles);
  return candles;
}

async function getTradingDaysForIndex({ indexKey, indexInfo, limit = 30, lookbackDays = 80 }) {
  if (!indexInfo?.indexToken) {
    return { source: "synthetic", days: buildSyntheticTradingDays(limit) };
  }

  const cacheKey = `trading-days:${indexKey}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const kite = getKiteClient();
  const now = new Date();
  const from = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  let candles = [];
  try {
    candles = await kite.getHistoricalData(indexInfo.indexToken, from, now, TF_MAP.day.kite);
  } catch (err) {
    console.warn(`Falling back to synthetic trading days for ${indexKey}:`, err?.message || err);
  }

  const days = Array.from(new Set(candles.map((c) => toDateOnly(c.date))))
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))
    .slice(0, limit);

  const payload = {
    source: days.length ? "kite" : "synthetic",
    days: days.length ? days : buildSyntheticTradingDays(limit),
  };

  cacheSet(cacheKey, payload, 30 * 60 * 1000); // 30 minutes for calendar
  return payload;
}

async function getDailyBreadth({ indexKey, indexInfo, date }) {
  const cacheKey = `daily:${indexKey}:${date}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const tokens = indexInfo.tokens || [];
  const results = await runWithLimit(
    tokens,
    DEFAULT_CONCURRENCY,
    async (token) => {
      const candles = await fetchHistoricalCandles(token, date, "day");
      const candle = candles.find((c) => toDateOnly(c.date) === date);
      if (!candle) return null;

      const open = Number(candle.open);
      const close = Number(candle.close);
      if (!Number.isFinite(open) || !Number.isFinite(close)) return null;

      const diff = close - open;
      return {
        token,
        diff,
        candle,
      };
    }
  );

  let advances = 0;
  let declines = 0;
  let unchanged = 0;

  for (const entry of results) {
    if (!entry) continue;
    if (entry.diff > 0) advances++;
    else if (entry.diff < 0) declines++;
    else unchanged++;
  }

  let indexCandle = null;
  if (indexInfo.indexToken) {
    try {
      const candles = await fetchHistoricalCandles(indexInfo.indexToken, date, "day");
      const candle = candles.find((c) => toDateOnly(c.date) === date);
      if (candle) {
        const open = Number(candle.open);
        const close = Number(candle.close);
        const high = Number(candle.high);
        const low = Number(candle.low);

        indexCandle = {
          open,
          close,
          high,
          low,
          range: Number.isFinite(high) && Number.isFinite(low) ? high - low : null,
          netChange: Number.isFinite(open) && Number.isFinite(close) ? close - open : null,
        };
      }
    } catch (err) {
      // best effort; keep breadth counts even if index candle fails
    }
  }

  const payload = {
    index: { key: indexKey, name: indexInfo.name },
    date,
    advances,
    declines,
    unchanged,
    total: advances + declines + unchanged,
    indexCandle,
  };

  cacheSet(cacheKey, payload);
  return payload;
}

async function getIntradayBreadth({ indexKey, indexInfo, date, tf = "5m" }) {
  const tfKey = normalizeTf(tf);
  const cacheKey = `intraday:${indexKey}:${date}:${tfKey}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const tokens = indexInfo.tokens || [];
  const tfMeta = TF_MAP[tfKey];
  const minutes = tfMeta?.minutes || 5;

  const tokenCandles = await runWithLimit(
    tokens,
    DEFAULT_CONCURRENCY,
    async (token) => {
      const candles = await fetchHistoricalCandles(token, date, tfKey);
      return { token, candles };
    }
  );

  const buckets = new Map(); // startISO -> stats

  for (const entry of tokenCandles) {
    if (!entry?.candles) continue;
    for (const candle of entry.candles) {
      if (toDateOnly(candle.date) !== date) continue;

      const start = new Date(candle.date);
      const startISO = start.toISOString();
      const key = startISO;

      if (!buckets.has(key)) {
        buckets.set(key, {
          start: startISO,
          advances: 0,
          declines: 0,
          unchanged: 0,
          net: 0,
          range: 0,
        });
      }

      const bucket = buckets.get(key);
      const open = Number(candle.open);
      const close = Number(candle.close);
      const high = Number(candle.high);
      const low = Number(candle.low);
      if (!Number.isFinite(open) || !Number.isFinite(close)) continue;

      const diff = close - open;
      if (diff > 0) bucket.advances++;
      else if (diff < 0) bucket.declines++;
      else bucket.unchanged++;

      bucket.net += Number.isFinite(diff) ? diff : 0;
      if (Number.isFinite(high) && Number.isFinite(low)) {
        bucket.range += high - low;
      }
    }
  }

  const intervals = Array.from(buckets.values()).sort(
    (a, b) => new Date(a.start) - new Date(b.start)
  );

  // attach end times for convenience
  for (const interval of intervals) {
    const start = new Date(interval.start);
    interval.end = new Date(start.getTime() + minutes * 60 * 1000).toISOString();
  }

  const payload = {
    index: { key: indexKey, name: indexInfo.name },
    date,
    tf: tfKey,
    intervals,
  };

  cacheSet(cacheKey, payload);
  return payload;
}

module.exports = {
  getTradingDaysForIndex,
  getDailyBreadth,
  getIntradayBreadth,
};
