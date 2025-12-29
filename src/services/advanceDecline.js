const { DateTime } = require("luxon");
const pLimit = require("p-limit");
const { getIndexConstituents, getIndexInstrumentToken } = require("./indexConstituents");
const { getKiteClient } = require("./kiteClient");


const SUPPORTED_INDEXES = new Set(["NIFTY50", "BANKNIFTY", "FINNIFTY"]);
const DEFAULT_CONCURRENCY = 3;

// Default market hours (IST)
const DEFAULT_FROM_TIME = "09:15:00";
const DEFAULT_TO_TIME = "15:30:00";

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

function normalizeIndexName(indexName) {
  const normalized = String(indexName || "").toUpperCase();
  if (!SUPPORTED_INDEXES.has(normalized)) {
    throw new ValidationError(
      `Unsupported indexName '${indexName}'. Supported values: ${Array.from(SUPPORTED_INDEXES).join(", ")}.`
    );
  }
  return normalized;
}

function normalizeConcurrency(concurrency) {
  if (concurrency === undefined || concurrency === null || concurrency === "") {
    return DEFAULT_CONCURRENCY;
  }
  const value = Number(concurrency);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError("concurrency must be a positive integer.");
  }
  return value;
}

function parseDateTime({ date, time, label }) {
  const value = DateTime.fromFormat(`${date} ${time}`, "yyyy-MM-dd HH:mm:ss", {
    zone: "Asia/Kolkata",
  });

  if (!value.isValid) {
    throw new ValidationError(`Invalid ${label}. Expected YYYY-MM-DD and HH:mm:ss in IST.`);
  }
  return value;
}

function buildWindow({ date, fromTime, toTime }) {
  const fromDateTime = parseDateTime({ date, time: fromTime, label: "fromTime" });
  const toDateTime = parseDateTime({ date, time: toTime, label: "toTime" });

  if (toDateTime <= fromDateTime) {
    throw new ValidationError("toTime must be after fromTime.");
  }

  return {
    fromDate: fromDateTime.toJSDate(),
    toDate: toDateTime.plus({ seconds: 1 }).toJSDate(),
    fromDT: fromDateTime,
    toDT: toDateTime,
  };
}

function buildDayWindow(date) {
  // full day window in IST
  const start = DateTime.fromFormat(`${date} 00:00:00`, "yyyy-MM-dd HH:mm:ss", { zone: "Asia/Kolkata" });
  const end = DateTime.fromFormat(`${date} 23:59:59`, "yyyy-MM-dd HH:mm:ss", { zone: "Asia/Kolkata" });
  if (!start.isValid || !end.isValid) {
    throw new ValidationError("Invalid date. Expected YYYY-MM-DD.");
  }
  return {
    fromDate: start.toJSDate(),
    toDate: end.plus({ seconds: 1 }).toJSDate(),
  };
}

function mapUiIntervalToKite(interval) {
  const v = String(interval || "").toLowerCase();

  // If UI sends 5/15/60 etc:
  if (v === "5" || v === "5m" || v === "5min") return "5minute";
  if (v === "15" || v === "15m" || v === "15min") return "15minute";
  if (v === "60" || v === "60m" || v === "60min" || v === "1h") return "60minute";
  if (v === "1" || v === "1m" || v === "1min" || v === "minute") return "minute";

  // If UI already sends kite intervals:
  if (v === "3minute" || v === "5minute" || v === "10minute" || v === "15minute" || v === "30minute" || v === "60minute" || v === "day") {
    return v;
  }

  // fall back (but validate below)
  return interval;
}

function intervalMinutes(kiteInterval) {
  switch (kiteInterval) {
    case "minute": return 1;
    case "3minute": return 3;
    case "5minute": return 5;
    case "10minute": return 10;
    case "15minute": return 15;
    case "30minute": return 30;
    case "60minute": return 60;
    default: return null;
  }
}

function toIstHHmm(dtLike) {
  // dtLike may be JS Date or string
  const dt = dtLike instanceof Date
    ? DateTime.fromJSDate(dtLike, { zone: "Asia/Kolkata" })
    : DateTime.fromISO(String(dtLike), { zone: "Asia/Kolkata" });

  return dt.toFormat("HH:mm");
}

function sortBySlotStart(rows) {
  // slot_label is "HH:mm - HH:mm"
  return rows.sort((a, b) => {
    const aStart = a.slot_label.split(" - ")[0];
    const bStart = b.slot_label.split(" - ")[0];
    return aStart.localeCompare(bStart);
  });
}



async function fetchCandlesSafe(kite, instrumentToken, kiteInterval, fromDate, toDate) {
  try {
    const candles = await kite.getHistoricalData(
      instrumentToken,
      kiteInterval,
      fromDate,
      toDate,
      false,
      false
    );
    return Array.isArray(candles) ? candles : [];
  } catch (err) {
    return [];
  }
}

async function getAdvanceDecline({ indexName, date, fromTime, toTime, interval, concurrency }) {
  const normalizedIndexName = normalizeIndexName(indexName);

  if (!date) throw new ValidationError("date is required (YYYY-MM-DD).");
  if (!interval) throw new ValidationError("interval is required.");

  // Timeframe window defaults to full market hours if not provided
  const tfFrom = fromTime || DEFAULT_FROM_TIME;
  const tfTo = toTime || DEFAULT_TO_TIME;

  // Build timeframe window (for rows)
  const { fromDate, toDate, fromDT, toDT } = buildWindow({ date, fromTime: tfFrom, toTime: tfTo });

  // Daily window (for daily card) - ALWAYS full day
  const dayWindow = buildDayWindow(date);

  const kiteInterval = mapUiIntervalToKite(interval);
  const mins = intervalMinutes(kiteInterval);
  if (!mins) {
    throw new ValidationError(
      `Unsupported timeframe interval '${interval}'. Use minute/5minute/15minute/60minute (or UI values 5min/15min/1h).`
    );
  }

  const limit = pLimit(normalizeConcurrency(concurrency));
  const kite = getKiteClient();

  const constituents = await getIndexConstituents(normalizedIndexName);

  // Index instrument token for range/net
  const indexToken = await getIndexInstrumentToken(normalizedIndexName);


  /**
   * 1) DAILY CARD
   * - Use day candles for each constituent (interval = 'day')
   * - adv/dec based on day close vs day open
   * - Range/Net from index day candle
   */
  const dailyTasks = constituents.map((c) =>
    limit(async () => {
      const candles = await fetchCandlesSafe(kite, c.instrument_token, "day", dayWindow.fromDate, dayWindow.toDate);
      if (!candles.length) return { status: "no_data" };

      const d = candles[0]; // day candle
      const open = d.open;
      const close = d.close;

      if (close > open) return { status: "advance" };
      if (close < open) return { status: "decline" };
      return { status: "unchanged" };
    })
  );

  const dailyResults = await Promise.all(dailyTasks);

  const daily = { advances: 0, declines: 0, unchanged: 0, no_data: 0 };
  for (const r of dailyResults) {
    if (r.status === "advance") daily.advances += 1;
    else if (r.status === "decline") daily.declines += 1;
    else if (r.status === "unchanged") daily.unchanged += 1;
    else daily.no_data += 1;
  }

  const indexDayCandles = await fetchCandlesSafe(kite, indexToken, "day", dayWindow.fromDate, dayWindow.toDate);
  if (!indexDayCandles.length) {
    // still return daily breadth counts, but range/net missing
    daily.rangePts = null;
    daily.netPts = null;
  } else {
    const d = indexDayCandles[0];
    daily.rangePts = Number((d.high - d.low).toFixed(2));
    daily.netPts = Number((d.close - d.open).toFixed(2));
  }

  /**
   * 2) TIMEFRAME ROWS (DYNAMIC)
   * - Fetch index candles once (for range/net per slot)
   * - Fetch each constituent candles and aggregate adv/dec per candle time
   */
  const indexTfCandles = await fetchCandlesSafe(kite, indexToken, kiteInterval, fromDate, toDate);
  const indexByTime = new Map();
  for (const c of indexTfCandles) {
    const t = toIstHHmm(c.date);
    indexByTime.set(t, {
      rangePts: Number((c.high - c.low).toFixed(2)),
      netPts: Number((c.close - c.open).toFixed(2)),
    });
  }

  // Aggregate map: time -> counts
  const agg = new Map(); // HH:mm -> {green, red, unchanged}
  function ensureAgg(t) {
    if (!agg.has(t)) agg.set(t, { green: 0, red: 0, unchanged: 0 });
    return agg.get(t);
  }

  const tfTasks = constituents.map((c) =>
    limit(async () => {
      const candles = await fetchCandlesSafe(kite, c.instrument_token, kiteInterval, fromDate, toDate);
      if (!candles.length) return;

      for (const k of candles) {
        const t = toIstHHmm(k.date);
        const bucket = ensureAgg(t);

        if (k.close > k.open) bucket.green += 1;
        else if (k.close < k.open) bucket.red += 1;
        else bucket.unchanged += 1;
      }
    })
  );

  await Promise.all(tfTasks);

  // Build rows: slot_label from candle time + interval minutes
  const rows = [];
  for (const [t, counts] of agg.entries()) {
    const start = DateTime.fromFormat(`${date} ${t}:00`, "yyyy-MM-dd HH:mm:ss", { zone: "Asia/Kolkata" });
    let end = start.plus({ minutes: mins });

    // clamp end to requested toTime
    if (end > toDT) end = toDT;
    
    const label = `${start.toFormat("HH:mm")} - ${end.toFormat("HH:mm")}`;
    const idx = indexByTime.get(t) || { rangePts: null, netPts: null };

    rows.push({
      slot_label: label,
      green: counts.green,
      red: counts.red,
      unchanged: counts.unchanged,
      rangePts: idx.rangePts,
      netPts: idx.netPts,
    });
  }

  sortBySlotStart(rows);

  return {
    indexName: normalizedIndexName,
    date,
    daily,
    timeframe: {
      interval: kiteInterval,
      fromTime: fromDT.toFormat("HH:mm:ss"),
      toTime: toDT.toFormat("HH:mm:ss"),
    },
    rows,
  };
}
function roundDownToInterval(dt, minutes) {
  const m = Math.floor(dt.minute / minutes) * minutes;
  return dt.set({ minute: m, second: 0, millisecond: 0 });
}

function hasCompletedSlot(now, intervalMinutes) {
  const marketOpen = now.set({ hour: 9, minute: 15, second: 0, millisecond: 0 });
  const mins = Math.floor(now.diff(marketOpen, "minutes").minutes);
  return mins >= intervalMinutes;
}

async function getAdvanceDeclineLatestSlot({ indexName, interval, concurrency }) {
  const kiteInterval = mapUiIntervalToKite(interval); // keep compatibility
  return getLiveBreadthSummaryLatestSlot({
    indexName,
    interval: kiteInterval,
    concurrency,
  });
}


// ✅ in-memory cache (since you can't run Redis)
const liveSlotCache = new Map();
// cacheKey -> { expiresAt, payload }

function cacheGetLive(key) {
  const v = liveSlotCache.get(key);
  if (!v) return null;
  if (Date.now() > v.expiresAt) {
    liveSlotCache.delete(key);
    return null;
  }
  return v.payload;
}

function cacheSetLive(key, payload, ttlMs) {
  liveSlotCache.set(key, { payload, expiresAt: Date.now() + ttlMs });
}

// slight grace so Kite has time to publish the completed candle
const CANDLE_GRACE_SECONDS = 20;

async function getLiveBreadthSummaryLatestSlot({ indexName, interval, concurrency }) {
  const normalizedIndexName = normalizeIndexName(indexName);

  const intervalMap = {
    "5minute": 5,
    "15minute": 15,
    "60minute": 60,
  };

  const mins = intervalMap[interval];
  if (!mins) throw new ValidationError("Unsupported interval");

  const now = DateTime.now().setZone("Asia/Kolkata");

  const marketOpen = now.set({ hour: 9, minute: 15, second: 0, millisecond: 0 });
  const marketClose = now.set({ hour: 15, minute: 30, second: 0, millisecond: 0 });

  // ✅ market closed guard
  if (now < marketOpen || now > marketClose) {
    return {
      indexName: normalizedIndexName,
      interval,
      window: {
        date: now.toFormat("yyyy-MM-dd"),
        fromTime: DEFAULT_FROM_TIME,
        toTime: DEFAULT_TO_TIME,
      },
      slotCompleted: false,
      summary: { advances: 0, declines: 0, unchanged: 0, no_data: 0 },
      source: "computed",
      message: "Market closed",
    };
  }

  // ✅ use grace: treat candle as "completed" only after grace seconds
  const nowForCandle = now.minus({ seconds: CANDLE_GRACE_SECONDS });
  const end = roundDownToInterval(nowForCandle, mins);

  // if we haven't reached first full slot end yet (e.g., 9:16 for 5m)
  if (end <= marketOpen) {
    return {
      indexName: normalizedIndexName,
      interval,
      window: {
        date: now.toFormat("yyyy-MM-dd"),
        fromTime: DEFAULT_FROM_TIME,
        toTime: DEFAULT_TO_TIME,
      },
      slotCompleted: false,
      summary: { advances: 0, declines: 0, unchanged: 0, no_data: 0 },
      source: "computed",
      message: `Waiting for first ${mins}-minute candle`,
    };
  }

  const start = end.minus({ minutes: mins });

  const date = start.toFormat("yyyy-MM-dd");
  const fromTime = start.toFormat("HH:mm:ss");
  const toTime = end.toFormat("HH:mm:ss");

  // ✅ cache per slot (so your UI polling doesn't recompute)
  const cacheKey = `live:${normalizedIndexName}:${interval}:${date}:${fromTime}:${toTime}`;
  const cached = cacheGetLive(cacheKey);
  if (cached) return cached;

  const limit = pLimit(normalizeConcurrency(concurrency));
  const kite = getKiteClient();

  // constituents
  const constituents = await getIndexConstituents(normalizedIndexName);

  // compute summary: 1 candle per constituent in [start, end]
  const tasks = constituents.map((c) =>
    limit(async () => {
      const candles = await fetchCandlesSafe(kite, c.instrument_token, interval, start.toJSDate(), end.toJSDate());
      if (!candles.length) return "no_data";

      // Usually 1 candle, but safe: take the last candle in window
      const k = candles[candles.length - 1];
      if (k.close > k.open) return "advance";
      if (k.close < k.open) return "decline";
      return "unchanged";
    })
  );

  const results = await Promise.all(tasks);

  const summary = { advances: 0, declines: 0, unchanged: 0, no_data: 0 };
  for (const r of results) {
    if (r === "advance") summary.advances += 1;
    else if (r === "decline") summary.declines += 1;
    else if (r === "unchanged") summary.unchanged += 1;
    else summary.no_data += 1;
  }

  const payload = {
    indexName: normalizedIndexName,
    interval,
    window: {
      date,
      fromTime,
      toTime,
    },
    slotCompleted: true,
    summary,
    source: "computed",
  };

  // ✅ cache until next slot boundary (rough TTL)
  // ex: for 5m keep ~30s-60s, for 15m keep ~60s-120s, etc.
  const ttlMs = Math.min(90_000, mins * 60_000);
  cacheSetLive(cacheKey, payload, ttlMs);

  return payload;
}


module.exports = {
  getAdvanceDecline,
  getAdvanceDeclineLatestSlot,
  ValidationError,
};
