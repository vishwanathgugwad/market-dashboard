function ema(candles, period) {
  if (!Array.isArray(candles) || candles.length < period) return null;
  const closes = candles.map((c) => Number(c.close)).filter(Number.isFinite);
  if (closes.length < period) return null;

  const multiplier = 2 / (period + 1);
  let emaValue = closes.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  for (let i = period; i < closes.length; i += 1) {
    emaValue = (closes[i] - emaValue) * multiplier + emaValue;
  }

  return emaValue;
}

function rsi(candles, period = 14) {
  if (!Array.isArray(candles) || candles.length <= period) return null;

  const closes = candles.map((c) => Number(c.close));
  if (closes.some((val) => !Number.isFinite(val))) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i += 1) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i += 1) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function bollingerBands(candles, period = 20, stdDev = 2) {
  if (!Array.isArray(candles) || candles.length < period) return null;
  const closes = candles.slice(-period).map((c) => Number(c.close));
  if (closes.some((val) => !Number.isFinite(val))) return null;

  const mean = closes.reduce((sum, val) => sum + val, 0) / period;
  const variance = closes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
  const deviation = Math.sqrt(variance);

  return {
    upper: mean + stdDev * deviation,
    middle: mean,
    lower: mean - stdDev * deviation,
  };
}

function atr(candles, period = 14) {
  if (!Array.isArray(candles) || candles.length <= period) return null;

  const recent = candles.slice(-(period + 1));
  const ranges = [];

  for (let i = 1; i < recent.length; i += 1) {
    const current = recent[i];
    const previous = recent[i - 1];

    const high = Number(current.high);
    const low = Number(current.low);
    const prevClose = Number(previous.close);

    if (![high, low, prevClose].every(Number.isFinite)) return null;

    const range = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    ranges.push(range);
  }

  if (ranges.length < period) return null;
  return ranges.reduce((sum, val) => sum + val, 0) / period;
}

function supportResistance(candles, lookback = 20) {
  if (!Array.isArray(candles) || candles.length === 0) return null;
  const slice = candles.slice(-lookback);
  const lows = slice.map((c) => Number(c.low)).filter(Number.isFinite);
  const highs = slice.map((c) => Number(c.high)).filter(Number.isFinite);

  if (!lows.length || !highs.length) return null;

  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs),
  };
}

module.exports = {
  ema,
  rsi,
  bollingerBands,
  atr,
  supportResistance,
};
