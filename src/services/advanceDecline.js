const { DateTime } = require("luxon");
const pLimit = require("p-limit");
const { getIndexConstituents } = require("./indexConstituents");
const { getKiteClient } = require("./kiteClient");

const SUPPORTED_INDEXES = new Set(["NIFTY50", "BANKNIFTY", "FINNIFTY"]);
const DEFAULT_CONCURRENCY = 3;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

function parseDateTime({ date, time, label }) {
  const value = DateTime.fromFormat(`${date} ${time}`, "yyyy-MM-dd HH:mm:ss", {
    zone: "Asia/Kolkata",
  });

  if (!value.isValid) {
    throw new ValidationError(`Invalid ${label}. Expected format YYYY-MM-DD and HH:mm:ss in IST.`);
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
  };
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

async function getAdvanceDecline({ indexName, date, fromTime, toTime, interval, concurrency }) {
  const normalizedIndexName = normalizeIndexName(indexName);

  if (!date || !fromTime || !toTime) {
    throw new ValidationError("date, fromTime, and toTime are required.");
  }

  if (!interval || typeof interval !== "string") {
    throw new ValidationError("interval is required.");
  }

  const { fromDate, toDate } = buildWindow({ date, fromTime, toTime });
  const limit = pLimit(normalizeConcurrency(concurrency));
  const kite = getKiteClient();

  const constituents = await getIndexConstituents(normalizedIndexName);

  const tasks = constituents.map((constituent) =>
    limit(async () => {
      try {
        const candles = await kite.getHistoricalData(
          constituent.instrument_token,
          interval,
          fromDate,
          toDate,
          false,
          false
        );

        if (!candles || candles.length === 0) {
          return {
            symbol: constituent.tradingsymbol,
            status: "no_data",
          };
        }

        const lastCandle = candles[candles.length - 1];
        const open = lastCandle.open;
        const close = lastCandle.close;

        let status = "unchanged";
        if (close > open) status = "advance";
        else if (close < open) status = "decline";

        return {
          symbol: constituent.tradingsymbol,
          status,
          open,
          close,
        };
      } catch (err) {
        return {
          symbol: constituent.tradingsymbol,
          status: "error",
          error: err?.message || String(err),
        };
      }
    })
  );

  const results = await Promise.all(tasks);
  const summary = {
    advances: 0,
    declines: 0,
    unchanged: 0,
    no_data: 0,
    errors: 0,
  };

  for (const result of results) {
    if (result.status === "advance") summary.advances += 1;
    else if (result.status === "decline") summary.declines += 1;
    else if (result.status === "unchanged") summary.unchanged += 1;
    else if (result.status === "no_data") summary.no_data += 1;
    else if (result.status === "error") summary.errors += 1;
  }

  return {
    indexName: normalizedIndexName,
    interval,
    window: {
      date,
      fromTime,
      toTime,
    },
    summary,
    results,
  };
}

module.exports = {
  getAdvanceDecline,
  ValidationError,
};
