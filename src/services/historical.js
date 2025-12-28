const { getKiteClient } = require("./kiteClient");

const DAY_TIMEFRAME = "day";
const tradingDaysCache = new Map();

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
  const entry = tradingDaysCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt > Date.now()) return entry.data;
  tradingDaysCache.delete(key);
  return null;
}

function cacheSet(key, data, ttlMs) {
  tradingDaysCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function getTradingDaysForIndex({
  indexKey,
  indexInfo,
  limit = 30,
  lookbackDays = 80,
  anchorDate = null,
}) {
  if (!indexInfo?.indexToken) {
    return { source: "synthetic", days: buildSyntheticTradingDays(limit) };
  }

  const anchorKey = anchorDate ? toDateOnly(anchorDate) : "latest";
  const cacheKey = `trading-days:${indexKey}:${anchorKey}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const kite = getKiteClient();
  const to = anchorDate ? istEndOfDay(toDateOnly(anchorDate)) : new Date();
  const from = new Date(to.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  let candles = [];
  try {
    candles = await kite.getHistoricalData(indexInfo.indexToken, from, to, DAY_TIMEFRAME);
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

  cacheSet(cacheKey, payload, 30 * 60 * 1000);
  return payload;
}

module.exports = {
  getTradingDaysForIndex,
};
