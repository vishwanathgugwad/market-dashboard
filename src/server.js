const express = require("express");
const { getKiteClient } = require("./services/kiteClient");
const { getTradingDaysForIndex } = require("./services/historical");
const { getAdvanceDecline, ValidationError, getAdvanceDeclineLatestSlot} = require("./services/advanceDecline");
const { getIndexContributorsLive } = require("./services/indexContributors");
const { getLiveIndexQuote } = require("./services/liveIndexQuote");
const { getRedis } = require("./cache/redis");  
const { buildBreadthKeys } = require("./cache/breadthKey");
const { getAnalysisSummary } = require("./analysis/summary");

const CONTRIBUTORS_CACHE_TTL_MS = 20 * 1000;
const contributorsCache = new Map();

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
  
    // ✅ Requirement: parse concurrency as Number if present
    const parsedConcurrency =
      concurrency === undefined || concurrency === null || concurrency === ""
        ? undefined
        : Number(concurrency);
  
    // Defaults so cache key is stable even when UI omits them
    const safeFromTime = fromTime || "09:15:00";
    const safeToTime = toTime || "15:30:00";
  
    const { cacheKey, lockKey } = buildBreadthKeys({
      indexName,
      interval,
      date,
      fromTime: safeFromTime,
      toTime: safeToTime,
    });
  
    try {
      const redis = await getRedis();
  
      // 1) Cache hit
      const cached = await redis.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        return res.json({ ...data, source: "redis_cache" });
      }
  
      // 2) Acquire lock (single-flight)
      const lockAcquired = await redis.set(lockKey, "1", { NX: true, EX: 30 });
  
      if (lockAcquired) {
        try {
          const data = await getAdvanceDecline({
            indexName,
            date,
            fromTime: safeFromTime,
            toTime: safeToTime,
            interval,
            concurrency: parsedConcurrency,
          });
  
          // 15 min TTL
          await redis.set(cacheKey, JSON.stringify(data), { EX: 900 });
  
          return res.json({ ...data, source: "computed" });
        } finally {
          // Always release lock
          try {
            await redis.del(lockKey);
          } catch (_) {}
        }
      }
  
      // 3) Lock not acquired -> wait for cache
      const attempts = 20;
      const delayMs = 500;
  
      for (let i = 0; i < attempts; i++) {
        await new Promise((r) => setTimeout(r, delayMs));
        const afterWait = await redis.get(cacheKey);
        if (afterWait) {
          const data = JSON.parse(afterWait);
          return res.json({ ...data, source: "redis_cache_after_wait" });
        }
      }
  
      // 4) Still no cache
      return res.status(202).json({
        error: "Breadth is being computed. Please retry.",
      });
    } catch (err) {
      if (err instanceof ValidationError) {
        return res.status(400).json({ error: err.message });
      }
      console.error("Failed to load breadth", err);
      return res.status(500).json({ error: "Failed to load breadth" });
    }
  });

  app.get("/api/live/breadth/:indexName", async (req, res) => {
    try {
      const indexName = req.params.indexName;
      const interval = req.query.interval || "5minute";
      const concurrency = req.query.concurrency;
  
      const data = await getAdvanceDeclineLatestSlot({ indexName, interval, concurrency });
      res.json(data);
    } catch (err) {
      res.status(400).json({ error: err?.message || "Failed" });
    }
  });

  app.get("/api/live/index/:indexKey/quote", async (req, res) => {
    try {
      const { indexKey } = req.params;
      const payload = await getLiveIndexQuote({ indexKey });
      return res.json(payload);
    } catch (err) {
      console.error("Failed to load index quote", err);
      return res.status(502).json({ error: err?.message || "Failed to load index quote." });
    }
  });

  // curl "http://localhost:3000/api/analysis/summary?index=NIFTY50&timeframe=15minute&indicators=ema,rsi,bb"
  app.get("/api/analysis/summary", async (req, res) => {
    try {
      const index = String(req.query.index || "").toUpperCase();
      const timeframe = String(req.query.timeframe || "").toLowerCase();
      const indicators = req.query.indicators || "";

      const payload = await getAnalysisSummary({ index, timeframe, indicators });
      return res.json(payload);
    } catch (err) {
      console.error("Failed to build analysis summary", err);
      return res.status(400).json({
        error: err?.message || "Failed to build analysis summary.",
      });
    }
  });


  app.get("/api/live/contributors/:indexRoute", async (req, res) => {
    const { indexRoute } = req.params;
    const limit = Number(req.query.limit) || 15;
    const indexMap = {
      nifty50: "NIFTY50",
      banknifty: "BANKNIFTY",
      finnifty: "FINNIFTY",
    };
    const indexName = indexMap[String(indexRoute || "").toLowerCase()];

    if (!indexName) {
      return res.status(404).json({ error: "Unsupported index route." });
    }

    const cacheKey = `${indexName}:${limit}`;
    const now = Date.now();
    const cached = contributorsCache.get(cacheKey);

    if (cached?.data && cached.expiresAt > now) {
      return res.json(cached.data);
    }

    if (cached?.inflight) {
      try {
        const data = await cached.inflight;
        return res.json(data);
      } catch (err) {
        contributorsCache.delete(cacheKey);
        return res.status(502).json({ error: "Failed to load contributors." });
      }
    }

    const inflight = (async () => {
      const data = await getIndexContributorsLive({ indexName, limit });
      contributorsCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + CONTRIBUTORS_CACHE_TTL_MS,
        inflight: null,
      });
      return data;
    })();

    contributorsCache.set(cacheKey, {
      data: cached?.data || null,
      expiresAt: cached?.expiresAt || 0,
      inflight,
    });

    try {
      const data = await inflight;
      return res.json(data);
    } catch (err) {
      contributorsCache.delete(cacheKey);
      console.error("Failed to load contributors", err);
      return res.status(502).json({ error: "Failed to load contributors." });
    }
  });
  

  return app;
}

module.exports = { createServer };
