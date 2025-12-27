const env = require("./config/env");
const { createServer } = require("./server");
const { KiteStream } = require("./services/kiteStream");
const { loadInstruments } = require("./services/instruments");
const { CandleStore } = require("./services/candles");
const { buildIndexTokens } = require("./services/indexTokens");

async function main() {
  const instruments = await loadInstruments();
  const { indexMap, allTokens } = buildIndexTokens(instruments);

  console.log(`Loaded instruments: ${instruments.length}`);
  for (const [key, info] of Object.entries(indexMap)) {
    console.log(`Index ${key} (${info.name}) tokens: ${info.tokens.length}`);
    console.log(`Missing symbols (${info.missing.length}):`, info.missing);
  }

  const candleStore = new CandleStore({ maxPoints: 2000 });
  const tickBuffer = [];
  let tickBufferIndex = 0;
  let processingTicks = false;
  let lastTickLogAt = 0;

  const stream = new KiteStream({
    apiKey: env.KITE_API_KEY,
    accessToken: env.KITE_ACCESS_TOKEN,
    tokens: allTokens,
  });

  const processTickBuffer = () => {
    const maxPerSlice = 5000;
    let processed = 0;

    while (tickBufferIndex < tickBuffer.length && processed < maxPerSlice) {
      candleStore.ingestTick(tickBuffer[tickBufferIndex]);
      tickBufferIndex += 1;
      processed += 1;
    }

    if (tickBufferIndex < tickBuffer.length) {
      setImmediate(processTickBuffer);
      return;
    }

    tickBuffer.length = 0;
    tickBufferIndex = 0;
    processingTicks = false;
  };

  // IMPORTANT: ingest ticks into candles
  stream.start((ticks) => {
    if (ticks?.length) {
      tickBuffer.push(...ticks);
      if (!processingTicks) {
        processingTicks = true;
        setImmediate(processTickBuffer);
      }
    }

    // optional compact log
    const t = ticks?.[0];
    const now = Date.now();
    if (t && now - lastTickLogAt > 1000) {
      lastTickLogAt = now;
      console.log(
        `[${t.exchange_timestamp?.toISOString?.() || "na"}] token=${t.instrument_token} ltp=${t.last_price}`
      );
    }
  });

  // Create server AFTER stream + candleStore exist
  const app = createServer({ stream, candleStore, indexTokens: indexMap });
  app.listen(env.PORT, () => console.log(`HTTP listening on :${env.PORT}`));
}

main().catch((e) => {
  console.error("Startup failed:", e);
  process.exit(1);
});
