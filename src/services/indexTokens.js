const aliases = require("../data/symbolAliases");
const indexes = require("../data/indexes");

function buildIndexTokens(instruments) {
  const instrumentMap = new Map();

  for (const row of instruments) {
    if (row.exchange !== "NSE") continue;
    if (row.instrument_type !== "EQ") continue;
    instrumentMap.set(row.tradingsymbol, Number(row.instrument_token));
  }

  const indexMap = {};
  const allTokens = new Set();

  for (const [key, def] of Object.entries(indexes)) {
    const symbols = def.symbols || [];
    const missing = [];
    const tokens = [];

    for (const rawSym of symbols) {
      const sym = aliases[rawSym] || rawSym;
      const token = instrumentMap.get(sym);

      if (!token) missing.push(rawSym);
      else {
        tokens.push(token);
        allTokens.add(token);
      }
    }

    indexMap[key] = {
      name: def.name || key,
      tokens,
      missing,
      symbols: [...symbols],
    };
  }

  return { indexMap, allTokens: [...allTokens], availableCount: instrumentMap.size };
}

function findSimilarSymbols(instruments, startsWith) {
  return instruments
    .filter((r) => r.exchange === "NSE" && r.instrument_type === "EQ")
    .map((r) => r.tradingsymbol)
    .filter((s) => s.startsWith(startsWith))
    .slice(0, 20);
}

module.exports = { buildIndexTokens, findSimilarSymbols };
