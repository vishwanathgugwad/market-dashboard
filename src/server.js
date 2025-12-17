const express = require("express");
const { computeBreadth } = require("./services/breadth");

function createServer({ stream, candleStore, niftyTokens }) {
  const app = express();

  // store tokens for routes
  app.locals.niftyTokens = niftyTokens || [];

  app.get("/health", (req, res) => {
    res.json({
      ok: true,
      service: "market-stream",
      stream: stream.status(),
      candles: candleStore?.stats?.(),
      niftyTokens: app.locals.niftyTokens.length,
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
  app.get("/index/nifty50/breadth", (req, res) => {
    const tf = (req.query.tf || "5m").toLowerCase();
    const baseline = (req.query.baseline || "prevClose"); // "prevClose" or "open"
  
    const result = computeBreadth({
      tokens: app.locals.niftyTokens,
      candleStore,
      tf,
      baseline,
    });
    res.json(result);
  });

  return app;
}

module.exports = { createServer };
