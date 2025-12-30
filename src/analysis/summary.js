const { getKiteClient } = require("../services/kiteClient");
const { getIndexInstrumentToken } = require("../services/indexConstituents");
const {
  ema,
  rsi,
  bollingerBands,
  atr,
  supportResistance,
} = require("../indicators");

const SUPPORTED_INDEXES = ["NIFTY50", "BANKNIFTY", "FINNIFTY"];
const SUPPORTED_TIMEFRAMES = ["5minute", "15minute", "60minute"];
const SUPPORTED_INDICATORS = new Set(["ema", "rsi", "bb", "atr", "support", "resistance"]);

function parseIndicators(indicatorsParam) {
  if (!indicatorsParam) return null;
  const indicators = String(indicatorsParam)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const invalid = indicators.filter((value) => !SUPPORTED_INDICATORS.has(value));
  if (invalid.length) {
    throw new Error(`Unsupported indicators: ${invalid.join(", ")}`);
  }

  return new Set(indicators);
}

function ensureValidIndex(index) {
  if (!SUPPORTED_INDEXES.includes(index)) {
    throw new Error(`Unsupported index. Use one of: ${SUPPORTED_INDEXES.join(", ")}`);
  }
}

function ensureValidTimeframe(timeframe) {
  if (!SUPPORTED_TIMEFRAMES.includes(timeframe)) {
    throw new Error(`Unsupported timeframe. Use one of: ${SUPPORTED_TIMEFRAMES.join(", ")}`);
  }
}

function timeframeToMinutes(timeframe) {
  switch (timeframe) {
    case "5minute":
      return 5;
    case "15minute":
      return 15;
    case "60minute":
      return 60;
    default:
      return 15;
  }
}

function computeTrend(ema9, ema21) {
  if (!Number.isFinite(ema9) || !Number.isFinite(ema21)) return "Sideways";
  if (ema9 > ema21) return "Bullish";
  if (ema9 < ema21) return "Bearish";
  return "Sideways";
}

function computeMomentum(rsiValue) {
  if (!Number.isFinite(rsiValue)) return "Neutral";
  if (rsiValue > 60) return "Strong";
  if (rsiValue < 40) return "Weak";
  return "Neutral";
}

function computeVolatility(currentBands, previousBands) {
  if (!currentBands || !previousBands) return "Moderate";
  const currentWidth = currentBands.upper - currentBands.lower;
  const previousWidth = previousBands.upper - previousBands.lower;

  if (!Number.isFinite(currentWidth) || !Number.isFinite(previousWidth)) return "Moderate";

  if (currentWidth > previousWidth * 1.05) return "High";
  if (currentWidth < previousWidth * 0.9) return "Compression";
  return "Moderate";
}

function computeBias(trend, momentum) {
  if (trend === "Bullish" && momentum !== "Weak") return "Bullish";
  if (trend === "Bearish" && momentum !== "Strong") return "Bearish";
  return "Neutral";
}

function buildSummary({ trend, momentum, bias, close, rsiValue }) {
  const trendText =
    trend === "Bullish"
      ? "trading above"
      : trend === "Bearish"
        ? "trading below"
        : "moving around";

  const momentumText =
    momentum === "Strong"
      ? "strong momentum"
      : momentum === "Weak"
        ? "weak momentum"
        : "neutral momentum";

  const movementText =
    bias === "Bullish"
      ? "Expect continuation to the upside while momentum holds."
      : bias === "Bearish"
        ? "Expect range-bound or downside continuation unless momentum improves."
        : "Expect range-bound movement until a clearer trend develops.";

  const riskText = Number.isFinite(rsiValue)
    ? `Risk: RSI is at ${rsiValue.toFixed(1)}; watch for reversals around key levels.`
    : "Risk: Momentum readings are limited; watch key support/resistance.";

  return `Index is ${trendText} short-term EMAs with ${momentumText}. ${movementText} ${riskText}`;
}

async function getAnalysisSummary({ index, timeframe, indicators }) {
  ensureValidIndex(index);
  ensureValidTimeframe(timeframe);

  const indicatorSet = parseIndicators(indicators) || new Set(SUPPORTED_INDICATORS);
  const kite = getKiteClient();
  const indexToken = await getIndexInstrumentToken(index);

  const now = new Date();
  const minutes = timeframeToMinutes(timeframe);
  const fromDate = new Date(now.getTime() - minutes * 120 * 60 * 1000);

  const candles = await kite.getHistoricalData(
    indexToken,
    timeframe,
    fromDate,
    now,
    false,
    false
  );

  if (!candles || candles.length === 0) {
    throw new Error("No candle data available for analysis.");
  }

  const slicedCandles = candles.slice(-120);
  const lastCandle = slicedCandles[slicedCandles.length - 1];

  const ema9 = indicatorSet.has("ema") ? ema(slicedCandles, 9) : null;
  const ema21 = indicatorSet.has("ema") ? ema(slicedCandles, 21) : null;
  const rsiValue = indicatorSet.has("rsi") ? rsi(slicedCandles, 14) : null;
  const bollinger = indicatorSet.has("bb") ? bollingerBands(slicedCandles, 20, 2) : null;
  const prevBollinger =
    indicatorSet.has("bb") && slicedCandles.length > 21
      ? bollingerBands(slicedCandles.slice(0, -1), 20, 2)
      : null;
  const atrValue = indicatorSet.has("atr") ? atr(slicedCandles, 14) : null;
  const supportRes =
    indicatorSet.has("support") || indicatorSet.has("resistance")
      ? supportResistance(slicedCandles)
      : null;

  const trend = computeTrend(ema9, ema21);
  const momentum = computeMomentum(rsiValue);
  const volatility = computeVolatility(bollinger, prevBollinger);
  const bias = computeBias(trend, momentum);

  const summary = buildSummary({
    trend,
    momentum,
    bias,
    close: Number(lastCandle.close),
    rsiValue,
  });

  const indicatorPayload = {
    ema: indicatorSet.has("ema")
      ? {
          ema9,
          ema21,
        }
      : null,
    rsi: indicatorSet.has("rsi") ? rsiValue : null,
    bollinger: indicatorSet.has("bb") ? bollinger : null,
    atr: indicatorSet.has("atr") ? atrValue : null,
    supportResistance:
      indicatorSet.has("support") || indicatorSet.has("resistance") ? supportRes : null,
  };

  console.log("[analysis] index", index);
  console.log("[analysis] timeframe", timeframe);
  console.log("[analysis] candle count", slicedCandles.length);
  console.log("[analysis] indicators", indicatorPayload);
  console.log("[analysis] bias", bias);

  return {
    index,
    timeframe,
    timestamp: (lastCandle.date || new Date()).toISOString(),
    price: {
      close: Number(lastCandle.close),
    },
    indicators: indicatorPayload,
    analysis: {
      trend,
      momentum,
      volatility,
      bias,
      summary,
    },
  };
}

module.exports = { getAnalysisSummary };
