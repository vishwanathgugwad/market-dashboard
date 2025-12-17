const env = require("./config/env");
const { createServer } = require("./server");
const { KiteStream } = require("./services/kiteStream");
const { buildNiftyTokens } = require("./services/niftyTokens");
const { loadInstruments } = require("./services/instruments");
const { CandleStore } = require("./services/candles");

async function main() {
  const instruments = await loadInstruments();
  const { tokens, missing } = buildNiftyTokens(instruments);

  console.log(`Loaded instruments: ${instruments.length}`);
  console.log(`Nifty tokens found: ${tokens.length}`);
  console.log(`Missing symbols (${missing.length}):`, missing);

  const candleStore = new CandleStore({ maxPoints: 2000 });

  const stream = new KiteStream({
    apiKey: env.KITE_API_KEY,
    accessToken: env.KITE_ACCESS_TOKEN,
    tokens,
  });

  // IMPORTANT: ingest ticks into candles
  stream.start((ticks) => {
    for (const tick of ticks) candleStore.ingestTick(tick);

    // optional compact log
    const t = ticks?.[0];
    if (t) {
      console.log(
        `[${t.exchange_timestamp?.toISOString?.() || "na"}] token=${t.instrument_token} ltp=${t.last_price}`
      );
    }
  });

  // Create server AFTER stream + candleStore exist
  const app = createServer({ stream, candleStore, niftyTokens: tokens });
  app.listen(env.PORT, () => console.log(`HTTP listening on :${env.PORT}`));
}

main().catch((e) => {
  console.error("Startup failed:", e);
  process.exit(1);
});
