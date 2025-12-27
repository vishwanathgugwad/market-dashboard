const { KiteTicker } = require("kiteconnect");

class KiteStream {
  constructor({ apiKey, accessToken, tokens }) {
    this.apiKey = apiKey;
    this.accessToken = accessToken;
    this.tokens = tokens;
    this.ticker = null;
    this.lastTickAt = null;
    this.connectedAt = null;
  }

  start(onTicks) {
    this.ticker = new KiteTicker({ api_key: this.apiKey, access_token: this.accessToken });

    this.ticker.on("connect", () => {
      this.connectedAt = new Date();
      console.log("Kite WS connected");
      this.ticker.subscribe(this.tokens);
      this.ticker.setMode(this.ticker.modeFull, this.tokens);
    });

    this.ticker.on("ticks", (ticks) => {
      this.lastTickAt = new Date();
      onTicks?.(ticks);
    });

    this.ticker.on("error", (err) => console.error("Kite WS error:", err));
    this.ticker.on("close", (code, reason) => console.log("Kite WS closed:", code, reason));
    this.ticker.on("reconnect", (count, interval) =>
      console.log("Kite WS reconnecting...", count, "next in", interval)
    );
    this.ticker.on("noreconnect", () => console.log("Kite WS no-reconnect"));

    this.ticker.connect();
  }

  status() {
    return {
      connectedAt: this.connectedAt,
      lastTickAt: this.lastTickAt,
      tokenCount: this.tokens.length,
    };
  }
}

module.exports = { KiteStream };
