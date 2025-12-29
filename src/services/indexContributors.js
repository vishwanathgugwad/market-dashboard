const { getKiteClient } = require("./kiteClient");
const {
  getIndexConstituents,
  getIndexInstrumentToken,
  getKiteInstrumentsCached,
} = require("./indexConstituents");

const INDEX_QUOTE_EXCHANGE = "NSE";

const getIndexQuoteKey = async (indexName) => {
  const indexToken = await getIndexInstrumentToken(indexName);
  const instruments = await getKiteInstrumentsCached();
  const match = instruments.find(
    (row) => Number(row.instrument_token) === Number(indexToken)
  );

  const tradingsymbol = match?.tradingsymbol || match?.name;
  if (!tradingsymbol) {
    throw new Error(`Unable to resolve index symbol for ${indexName}.`);
  }

  return `${INDEX_QUOTE_EXCHANGE}:${tradingsymbol}`;
};

const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

async function getIndexContributorsLive({
  indexName,
  limit = 15,
  baseline = "prevClose",
}) {
  const constituents = await getIndexConstituents(indexName);
  const quoteKeys = constituents
    .map((row) => row?.tradingsymbol)
    .filter(Boolean)
    .map((symbol) => `${INDEX_QUOTE_EXCHANGE}:${symbol}`);

  const indexQuoteKey = await getIndexQuoteKey(indexName);
  const uniqueKeys = Array.from(new Set([...quoteKeys, indexQuoteKey]));
  const kite = getKiteClient();
  const quotes = uniqueKeys.length ? await kite.getQuote(uniqueKeys) : {};
  const indexQuote = quotes[indexQuoteKey];

  if (!indexQuote?.last_price) {
    throw new Error(`Missing index quote for ${indexName}.`);
  }

  const indexLtp = Number(indexQuote.last_price);
  const ffmcValues = constituents.map((row) => toNumber(row.ffmc ?? row.marketCap) || 0);
  const totalFfmc = ffmcValues.reduce((sum, value) => sum + value, 0);
  const useFfmc = totalFfmc > 0;
  const weightSource = useFfmc ? "ffmc" : "equal";
  const equalWeight = constituents.length ? 1 / constituents.length : 0;

  const contributors = constituents
    .map((row, idx) => {
      const symbol = row.tradingsymbol;
      const quote = quotes[`${INDEX_QUOTE_EXCHANGE}:${symbol}`];

      const ltp = toNumber(quote?.last_price);
      const prevClose = toNumber(quote?.ohlc?.close);

      if (!symbol || ltp === null || prevClose === null || prevClose === 0) {
        return null;
      }

      const change = ltp - prevClose;
      const changePct = (change / prevClose) * 100;
      const weight = useFfmc ? ffmcValues[idx] / totalFfmc : equalWeight;
      const contribPts = indexLtp * weight * ((ltp - prevClose) / prevClose);

      return {
        symbol,
        change,
        changePct,
        contribPts,
        weight,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.contribPts) - Math.abs(a.contribPts))
    .slice(0, limit);

  return {
    indexName,
    asOf: new Date().toISOString(),
    indexLtp,
    baseline,
    weightSource,
    contributors,
  };
}

module.exports = { getIndexContributorsLive };
