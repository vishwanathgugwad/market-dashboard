const express = require("express");
const { computeBreadth } = require("./services/breadth");
const {
  getDailyBreadth,
  getIntradayBreadth,
  getTradingDaysForIndex,
} = require("./services/historical");

function createServer({ stream, candleStore, indexTokens }) {
  const app = express();

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // store tokens for routes
  app.locals.indexTokens = indexTokens || {};

  app.get("/health", (req, res) => {
    const indexSummary = Object.fromEntries(
      Object.entries(app.locals.indexTokens).map(([key, val]) => [key, {
        name: val.name,
        tokens: val.tokens.length,
        missing: val.missing.length,
      }])
    );

    res.json({
      ok: true,
      service: "market-stream",
      stream: stream.status(),
      candles: candleStore?.stats?.(),
      indexes: indexSummary,
      now: new Date(),
    });
  });

  app.get("/candles/:token", (req, res) => {
    const token = req.params.token;
    const tf = (req.query.tf || "5m").toLowerCase();
    const candles = candleStore.getCandles(token, tf);
    res.json({ token: Number(token), tf, count: candles.length, candles });
  });

  // ✅ Breadth endpoint (adv/dec) - MUST be inside createServer
  app.get("/index/:index/breadth", (req, res) => {
    const tf = (req.query.tf || "5m").toLowerCase();
    const baseline = (req.query.baseline || "prevClose"); // "prevClose" or "open"
    const indexKey = (req.params.index || "").toLowerCase();
    const indexInfo = app.locals.indexTokens[indexKey];

    if (!indexInfo) {
      return res.status(404).json({ ok: false, message: `Unknown index '${indexKey}'` });
    }

    const result = computeBreadth({
      tokens: indexInfo.tokens,
      candleStore,
      tf,
      baseline,
    });
    res.json({
      index: { key: indexKey, name: indexInfo.name },
      ...result,
    });
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

  // Historical daily breadth
  app.get("/historical/:index/daily", async (req, res) => {
    const indexKey = (req.params.index || "").toLowerCase();
    const date = req.query.date;
    const indexInfo = app.locals.indexTokens[indexKey];

    if (!indexInfo) return res.status(404).json({ ok: false, message: `Unknown index '${indexKey}'` });
    if (!date) return res.status(400).json({ ok: false, message: "date query param is required" });

    try {
      const result = await getDailyBreadth({ indexKey, indexInfo, date });
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("Failed to compute daily breadth", err);
      res.status(500).json({ ok: false, message: "Failed to compute daily breadth" });
    }
  });

  // Historical intraday breadth
  app.get("/historical/:index/intraday", async (req, res) => {
    const indexKey = (req.params.index || "").toLowerCase();
    const date = req.query.date;
    const tf = req.query.tf || "5m";
    const indexInfo = app.locals.indexTokens[indexKey];

    if (!indexInfo) return res.status(404).json({ ok: false, message: `Unknown index '${indexKey}'` });
    if (!date) return res.status(400).json({ ok: false, message: "date query param is required" });

    try {
      const result = await getIntradayBreadth({ indexKey, indexInfo, date, tf });
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("Failed to compute intraday breadth", err);
      res.status(500).json({ ok: false, message: "Failed to compute intraday breadth" });
    }
  });

  return app;
}

module.exports = { createServer };
