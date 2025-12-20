# Market Dashboard Backend (Kite Connect)

Real-time **market and index analytics backend** built on **Node.js + Zerodha Kite Connect**.

Designed to support **multiple indices** (Nifty 50, Bank Nifty, FinNifty, Midcap, Sensex, custom baskets) with live candles, breadth analytics, and movers.

---

## 🚀 Features
- Live WebSocket ingestion from Kite (Zerodha)
- 1-minute & 5-minute candle aggregation
- **Index-level breadth analysis** (advances / declines / unchanged)
- **Top gainers & losers** for selected index (5-minute movement)
- REST APIs for charts and analytics
- Extensible to support **any index or custom stock basket**
- Subscribes to **all configured indices at once** (e.g., Nifty 50, Bank Nifty, FinNifty, Midcap, Sensex)

---

## ⚙️ Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your environment file:
   ```bash
   cp .env.example .env
   ```
   Fill in `KITE_API_KEY` and `KITE_ACCESS_TOKEN` with your Zerodha Kite credentials.
3. Start the backend:
   ```bash
   npm run dev:server
   ```
   By default the API listens on `http://localhost:3000`.

---

## 📡 APIs

### Health
```http
GET /health
```

Returns service status, WebSocket connection info, candle stats and how many tokens are tracked per index.

Example (shortened):

```json
{
  "ok": true,
  "service": "market-stream",
  "stream": { "connected": true, "lastTickTs": "..." },
  "candles": { "symbols": 124, "points": { "1m": 2000, "5m": 2000 } },
  "indexes": {
    "nifty50": { "name": "Nifty 50", "tokens": 50, "missing": 0 },
    "banknifty": { "name": "Bank Nifty", "tokens": 12, "missing": 0 },
    "midcapnifty": { "name": "Nifty Midcap (sample)", "tokens": 25, "missing": 0 },
    "sensex": { "name": "Sensex", "tokens": 30, "missing": 0 }
  }
}
```

### Candles
```http
GET /candles/:token?tf=5m
```

Returns the stored 1m/5m candles for an instrument token.

### Breadth (any configured index)
```http
GET /index/:index/breadth?tf=5m&baseline=prevClose
```

`index` must match a key from `src/data/indexes.js` (e.g., `nifty50`, `banknifty`, `midcapnifty`, `sensex`, `finnifty`).

Returns:
- advances / declines / unchanged counts
- top 5 gainers / losers vs previous close (or vs candle open if `baseline=open`)

If your Kite instrument dump does not contain a ticker symbol, it will be excluded from the breadth counts. Use `findSimilarSymbols` helper in `src/services/indexTokens.js` to quickly get the updated name.

### Quick test URLs
- Health: [`http://localhost:3000/health`](http://localhost:3000/health)
- Candles for a token (replace `12345` with an instrument token): [`http://localhost:3000/candles/12345?tf=5m`](http://localhost:3000/candles/12345?tf=5m)
- Breadth for an index (e.g., `nifty50`): [`http://localhost:3000/index/nifty50/breadth?tf=5m&baseline=prevClose`](http://localhost:3000/index/nifty50/breadth?tf=5m&baseline=prevClose)
- Historical trading days (requires `index` query): [`http://localhost:3000/historical/trading-days?index=nifty50&days=30`](http://localhost:3000/historical/trading-days?index=nifty50&days=30)

---

## 🧩 Configure indices & baskets

- Default indices live in **`src/data/indexes.js`**. Each entry has a `name` and `symbols` array.
- Add, remove or tweak lists (e.g., add Smallcap 250, custom watchlists) and restart the service.
- All configured indices are merged into one subscription so every breadth endpoint is live simultaneously.
