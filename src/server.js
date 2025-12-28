const express = require("express");
const { getKiteClient } = require("./services/kiteClient");
const { getTradingDaysForIndex } = require("./services/historical");
const { getAdvanceDecline, ValidationError } = require("./services/advanceDecline");
const { getRedis } = require("./cache/redis");
const { buildBreadthCacheKey } = require("./cache/breadthCache");

const BREADTH_CACHE_TTL_SECONDS = 15 * 60;
const BREADTH_LOCK_TTL_SECONDS = 30;
const BREADTH_LOCK_WAIT_ATTEMPTS = 20;
const BREADTH_LOCK_WAIT_MS = 500;

async function waitForCachedBreadth(redis, cacheKey) {
  for (let attempt = 0; attempt < BREADTH_LOCK_WAIT_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, BREADTH_LOCK_WAIT_MS));
    const cached = await redis.get(cacheKey);
    if (cached) {
      return cached;
    }
  }
  return null;
}

function createServer({ stream, candleStore, indexTokens }) {
  const app = express();

  app.use((req, res, next) => {
    console.log("REQ", req.method, req.url);
    next();
  });

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // store tokens for routes
  app.locals.indexTokens = indexTokens || {};
  app.locals.stream = stream || null;
  app.locals.candleStore = candleStore || null;
  app.locals.startup = {
    ready: false,
    error: null,
    updatedAt: null,
  };
  app.locals.healthCache = {
    candles: null,
    updatedAt: null,
    lastError: null,
  };

  app.get("/health", (req, res) => {
    try {
      const indexSummary = Object.fromEntries(
        Object.entries(app.locals.indexTokens).map(([key, val]) => [key, {
          name: val.name,
          tokens: val.tokens.length,
          missing: val.missing.length,
        }])
      );

      const streamStatus = app.locals.stream?.status?.() || {
        connectedAt: null,
        lastTickAt: null,
        tokenCount: 0,
      };

      const healthCache = app.locals.healthCache;
      const cachedCandles = healthCache.candles;

      setImmediate(() => {
        try {
          healthCache.candles = app.locals.candleStore?.stats?.() || null;
          healthCache.updatedAt = new Date();
          healthCache.lastError = null;
        } catch (err) {
          healthCache.lastError = err?.message || String(err);
        }
      });

      res.json({
        ok: app.locals.startup.ready,
        service: "market-stream",
        stream: streamStatus,
        candles: cachedCandles,
        candlesUpdatedAt: healthCache.updatedAt,
        indexes: indexSummary,
        startup: app.locals.startup,
        now: new Date(),
      });
    } catch (err) {
      console.error("Health check failed:", err);
      res.status(500).json({
        ok: false,
        service: "market-stream",
        error: err?.message || String(err),
        now: new Date(),
      });
    }
  });

  app.get("/quote", async (req, res) => {
    const queryValue = req.query.i;
    if (!queryValue) {
      return res.status(400).json({
        ok: false,
        message: "i query param is required (e.g. /quote?i=NSE:INFY)",
      });
    }

    const instruments = (Array.isArray(queryValue) ? queryValue : [queryValue])
      .flatMap((value) => String(value).split(","))
      .map((value) => value.trim())
      .filter(Boolean);

    if (!instruments.length) {
      return res.status(400).json({
        ok: false,
        message: "i query param must include at least one instrument",
      });
    }

    try {
      const kite = getKiteClient();
      const data = await kite.getQuote(instruments);
      return res.json({ ok: true, instruments, data });
    } catch (err) {
      console.error("Failed to fetch quote", err);
      return res.status(502).json({
        ok: false,
        message: "Failed to fetch quote",
        error: err?.message || String(err),
      });
    }
  });

  // Historical data: list recent trading days
  app.get("/historical/trading-days", async (req, res) => {
    const indexKey = (req.query.index || "").toLowerCase();
    const days = Number(req.query.days) || 30;

    if (!indexKey) return res.status(400).json({ ok: false, message: "index query param is required" });
    const indexInfo = app.locals.indexTokens[indexKey];
    if (!indexInfo) return res.status(404).json({ ok: false, message: `Unknown index '${indexKey}'` });

    try {
      const result = await getTradingDaysForIndex({ indexKey, indexInfo, limit: days });
      res.json({
        ok: true,
        index: { key: indexKey, name: indexInfo.name },
        ...result,
      });
    } catch (err) {
      console.error("Failed to load trading days", err);
      res.status(500).json({ ok: false, message: "Failed to load trading days" });
    }
  });

  app.get("/api/breadth/:indexName", async (req, res) => {
    const { indexName } = req.params;
    const { date, fromTime, toTime, interval, concurrency } = req.query;
    let lockAcquired = false;

    try {
      const { cacheKey, lockKey } = buildBreadthCacheKey({
        indexName,
        interval,
        date,
        fromTime,
        toTime,
      });
      const redis = await getRedis();
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json({ ...JSON.parse(cached), source: "redis_cache" });
      }

      lockAcquired = await redis.set(lockKey, "1", {
        NX: true,
        EX: BREADTH_LOCK_TTL_SECONDS,
      });

      if (!lockAcquired) {
        const awaited = await waitForCachedBreadth(redis, cacheKey);
        if (awaited) {
          return res.json({ ...JSON.parse(awaited), source: "redis_cache_after_wait" });
        }
        return res.status(202).json({ error: "Breadth is being computed. Please retry." });
      }

      const data = await getAdvanceDecline({
        indexName,
        date,
        fromTime,
        toTime,
        interval,
        concurrency: concurrency !== undefined ? Number(concurrency) : undefined,
      });

      await redis.set(cacheKey, JSON.stringify(data), {
        EX: BREADTH_CACHE_TTL_SECONDS,
      });

      return res.json({ ...data, source: "computed" });
    } catch (err) {
      if (err instanceof ValidationError) {
        return res.status(400).json({ error: err.message });
      }
      console.error("Failed to load breadth", err);
      return res.status(500).json({ error: "Failed to load breadth" });
    } finally {
      try {
        if (lockAcquired) {
          const redis = await getRedis();
          await redis.del(buildBreadthCacheKey({ indexName, interval, date, fromTime, toTime }).lockKey);
        }
      } catch (err) {
        console.error("Failed to clear breadth lock", err);
      }
    }
  });

  return app;
}

module.exports = { createServer };
