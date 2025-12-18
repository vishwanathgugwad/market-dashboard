const express = require("express");
const { computeBreadth } = require("./services/breadth");

function createServer({ stream, candleStore, indexTokens }) {
  const app = express();

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

  return app;
}

module.exports = { createServer };
