function computeBreadth({ tokens, candleStore, tf = "5m", baseline = "prevClose" }) {
    let adv = 0, dec = 0, unch = 0;
    const movers = [];
  
    for (const token of tokens) {
      const candles = candleStore.getCandles(token, tf);
      if (!candles || candles.length === 0) continue;
  
      let o, c;
  
      if (baseline === "open") {
        // current candle close vs open
        const last = candles[candles.length - 1];
        o = Number(last.o);
        c = Number(last.c);
      } else {
        // prevClose: last close vs previous close (needs >=2 candles)
        if (candles.length < 2) continue;
        const prev = candles[candles.length - 2];
        const last = candles[candles.length - 1];
        o = Number(prev.c);
        c = Number(last.c);
      }
  
      if (!Number.isFinite(o) || !Number.isFinite(c) || o === 0) continue;
  
      const diff = c - o;
      if (diff > 0) adv++;
      else if (diff < 0) dec++;
      else unch++;
  
      const pct = (diff / o) * 100;
      movers.push({ token: Number(token), pct, o, c });
    }
  
    movers.sort((a, b) => b.pct - a.pct);
  
    return {
      tf,
      baseline,
      adv,
      dec,
      unch,
      total: adv + dec + unch,
      topGainers: movers.slice(0, 5),
      topLosers: movers.slice(-5).reverse(),
    };
  }
  
  module.exports = { computeBreadth };
  