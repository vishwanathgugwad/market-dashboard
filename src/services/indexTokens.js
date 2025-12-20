const aliases = require("../data/symbolAliases");
const indexes = require("../data/indexes");

function buildIndexTokens(instruments) {
  const equityInstrumentMap = new Map();
  const instrumentMap = new Map();

  for (const row of instruments) {
    if (row.exchange !== "NSE") continue;
    const token = Number(row.instrument_token);
    instrumentMap.set(row.tradingsymbol, token);

    if (row.instrument_type !== "EQ") continue;
    equityInstrumentMap.set(row.tradingsymbol, token);
  }

  const indexMap = {};
  const allTokens = new Set();

  for (const [key, def] of Object.entries(indexes)) {
    const symbols = def.symbols || [];
    const missing = [];
    const tokens = [];

    for (const rawSym of symbols) {
      const sym = aliases[rawSym] || rawSym;
      const token = equityInstrumentMap.get(sym);

      if (!token) missing.push(rawSym);
      else {
        tokens.push(token);
        allTokens.add(token);
      }
    }

    const indexToken = def.indexSymbol ? instrumentMap.get(def.indexSymbol) : null;

    indexMap[key] = {
      name: def.name || key,
      indexToken: indexToken ? Number(indexToken) : null,
      tokens,
      missing,
      symbols: [...symbols],
    };
  }

  return {
    indexMap,
    allTokens: [...allTokens],
    availableCount: equityInstrumentMap.size,
  };
}

function findSimilarSymbols(instruments, startsWith) {
  return instruments
    .filter((r) => r.exchange === "NSE" && r.instrument_type === "EQ")
    .map((r) => r.tradingsymbol)
    .filter((s) => s.startsWith(startsWith))
    .slice(0, 20);
}

module.exports = { buildIndexTokens, findSimilarSymbols };
