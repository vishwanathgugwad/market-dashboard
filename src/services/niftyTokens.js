const nifty50 = require("../data/nifty50");
const aliases = require("../data/symbolAliases");

function buildNiftyTokens(instruments) {
  const map = new Map();

  for (const row of instruments) {
    if (row.exchange !== "NSE") continue;
    if (row.instrument_type !== "EQ") continue;
    map.set(row.tradingsymbol, Number(row.instrument_token));
  }

  const missing = [];
  const tokens = [];

  for (const rawSym of nifty50) {
    const sym = aliases[rawSym] || rawSym;
    const t = map.get(sym);

    if (!t) missing.push(rawSym); // keep original name in missing for clarity
    else tokens.push(t);
  }

  return { tokens, missing, availableCount: map.size };
}

function findSimilarSymbols(instruments, startsWith) {
  return instruments
    .filter((r) => r.exchange === "NSE" && r.instrument_type === "EQ")
    .map((r) => r.tradingsymbol)
    .filter((s) => s.startsWith(startsWith))
    .slice(0, 20);
}

module.exports = { buildNiftyTokens, findSimilarSymbols };
