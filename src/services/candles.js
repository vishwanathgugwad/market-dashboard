function floorTo(tfMs, ts) {
    return new Date(Math.floor(ts.getTime() / tfMs) * tfMs);
  }
  
  class CandleStore {
    constructor({ maxPoints = 2000 } = {}) {
      this.maxPoints = maxPoints;
      this.series = {
        "1m": new Map(),
        "5m": new Map(),
      };
    }
  
    _upsert(tf, token, bucketISO, price) {
      const store = this.series[tf];
      if (!store.has(token)) store.set(token, new Map());
      const m = store.get(token);
  
      let c = m.get(bucketISO);
      if (!c) {
        c = { t: bucketISO, o: price, h: price, l: price, c: price };
        m.set(bucketISO, c);
  
        if (m.size > this.maxPoints) {
          const first = m.keys().next().value;
          m.delete(first);
        }
      } else {
        c.h = Math.max(c.h, price);
        c.l = Math.min(c.l, price);
        c.c = price;
      }
    }
  
    ingestTick(tick) {
      const token = Number(tick.instrument_token);
      const price = Number(tick.last_price);
      if (!token || !Number.isFinite(price)) return;
  
      // Align to exchange time when available
      const ts = tick.exchange_timestamp ? new Date(tick.exchange_timestamp) : new Date();
  
      const t1 = floorTo(60_000, ts).toISOString();
      const t5 = floorTo(5 * 60_000, ts).toISOString();
  
      this._upsert("1m", token, t1, price);
      this._upsert("5m", token, t5, price);
    }
  
    getCandles(token, tf = "5m") {
      const store = this.series[tf];
      if (!store) return [];
      const m = store.get(Number(token));
      if (!m) return [];
      return Array.from(m.values());
    }
  
    stats() {
      return {
        tf1mTokens: this.series["1m"].size,
        tf5mTokens: this.series["5m"].size,
      };
    }
  }
  
  module.exports = { CandleStore };
  