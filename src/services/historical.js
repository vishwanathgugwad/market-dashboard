const { getKiteClient } = require("./kiteClient");

const { DateTime } = require("luxon");
const { getIndexInstrumentToken } = require("./indexConstituents");

const DAY_TIMEFRAME = "day";
const DAY_INTERVAL = "day";
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
  limit = 30,
  lookbackDays = 120,
  anchorDate = null,
}) {
  const anchorKey = anchorDate ? toDateOnly(anchorDate) : "latest";
  const cacheKey = `trading-days:${indexKey}:${anchorKey}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  let indexToken;
  try {
    // ✅ Always resolve index token dynamically
    indexToken = await getIndexInstrumentToken(indexKey.toUpperCase());
  } catch (err) {
    console.warn(
      `[TRADING DAYS] Missing index token for ${indexKey}, using synthetic`,
      err?.message || err
    );
    return { source: "synthetic", days: buildSyntheticTradingDays(limit) };
  }

  const kite = getKiteClient();

  // ✅ Proper JS Date objects in IST
  const toDt = anchorDate
    ? DateTime.fromISO(anchorDate, { zone: "Asia/Kolkata" }).endOf("day")
    : DateTime.now().setZone("Asia/Kolkata").endOf("day");

  const fromDt = toDt.minus({ days: lookbackDays }).startOf("day");

  let candles = [];
  try {
    candles = await kite.getHistoricalData(
      indexToken,
      DAY_INTERVAL,
      fromDt.toJSDate(),
      toDt.toJSDate(),
      false,
      false
    );
  } catch (err) {
    console.warn(
      `Falling back to synthetic trading days for ${indexKey}:`,
      err?.message || err
    );
  }

  const days = Array.from(
    new Set(
      (candles || []).map((c) =>
        DateTime.fromJSDate(c.date)
          .setZone("Asia/Kolkata")
          .toFormat("yyyy-MM-dd")
      )
    )
  )
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
