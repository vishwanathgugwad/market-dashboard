require("dotenv").config();
const { KiteTicker } = require("kiteconnect");

const apiKey = process.env.KITE_API_KEY;
const accessToken = process.env.KITE_ACCESS_TOKEN;

if (!apiKey || !accessToken) {
  console.error("Missing KITE_API_KEY or KITE_ACCESS_TOKEN in .env");
  process.exit(1);
}

const ticker = new KiteTicker({ api_key: apiKey, access_token: accessToken });

// Pick ONE known instrument_token to test.
// (Example in docs shows 738561; replace with one you have confidence in.)
const TOKENS = [738561];

ticker.on("connect", () => {
  console.log("WS connected");
  ticker.subscribe(TOKENS);
  ticker.setMode(ticker.modeFull, TOKENS); // FULL gives richest tick fields :contentReference[oaicite:1]{index=1}
});

ticker.on("ticks", (ticks) => {
  console.log("Ticks:", ticks);
});

ticker.on("error", (err) => {
  console.error("WS error:", err);
});

ticker.on("close", (code, reason) => {
  console.log("WS closed:", code, reason);
});

// optional: auto reconnect
ticker.on("reconnect", (reconnectCount, reconnectInterval) => {
  console.log("Reconnecting...", reconnectCount, "next in", reconnectInterval);
});
ticker.on("noreconnect", () => console.log("Reconnect stopped"));

ticker.connect();
