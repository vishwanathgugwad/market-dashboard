const env = require("./config/env");
const { createServer } = require("./server");
const { KiteStream } = require("./services/kiteStream");
const { loadInstruments } = require("./services/instruments");
const { CandleStore } = require("./services/candles");
const { buildIndexTokens } = require("./services/indexTokens");

console.log("BOOT", __filename, "pid", process.pid);
setInterval(() => console.log("tick", new Date().toISOString()), 1000);

async function main() {
  const candleStore = new CandleStore({ maxPoints: 2000 });
  const app = createServer({ stream: null, candleStore, indexTokens: {} });

  app.listen(env.PORT, () => console.log(`HTTP listening on :${env.PORT}`));

  const tickBuffer = [];
  let tickBufferIndex = 0;
  let processingTicks = false;
  let lastTickLogAt = 0;

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

  try {
    const instruments = await loadInstruments({ timeoutMs: 15000 });
    const { indexMap, allTokens } = buildIndexTokens(instruments);

    console.log(`Loaded instruments: ${instruments.length}`);
    for (const [key, info] of Object.entries(indexMap)) {
      console.log(`Index ${key} (${info.name}) tokens: ${info.tokens.length}`);
      console.log(`Missing symbols (${info.missing.length}):`, info.missing);
    }

    const stream = new KiteStream({
      apiKey: env.KITE_API_KEY,
      accessToken: env.KITE_ACCESS_TOKEN,
      tokens: allTokens,
    });

    app.locals.stream = stream;
    app.locals.indexTokens = indexMap;

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

    app.locals.startup.ready = true;
    app.locals.startup.updatedAt = new Date();
  } catch (e) {
    app.locals.startup.error = e?.message || String(e);
    app.locals.startup.updatedAt = new Date();
    console.error("Startup failed:", e);
  }
}

main().catch((e) => {
  console.error("Startup failed:", e);
  process.exit(1);
});
