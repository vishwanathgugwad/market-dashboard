# market-dashboard
Real-time market analytics backend using Kite Connect (Zerodha).

# Market Dashboard Backend (Kite Connect)

Real-time **market and index analytics backend** built on **Node.js + Zerodha Kite Connect**.

Designed to support **multiple indices** (Nifty 50, Bank Nifty, FinNifty, custom baskets) with live candles, breadth analytics, and movers.

---

## 🚀 Features
- Live WebSocket ingestion from Kite (Zerodha)
- 1-minute & 5-minute candle aggregation
- **Index-level breadth analysis** (advances / declines / unchanged)
- **Top gainers & losers** for selected index (5-minute movement)
- REST APIs for charts and analytics
- Extensible to support **any index or custom stock basket**

---

## 📡 APIs

### Health
```http
GET /health

