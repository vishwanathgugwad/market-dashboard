// src/cache/breadthKey.js
function buildBreadthKeys({ indexName, interval, date, fromTime, toTime }) {
    const INDEX = String(indexName || "").toUpperCase();
    const key = `${INDEX}|${interval}|${date}|${fromTime}|${toTime}`;
    return {
      key,
      cacheKey: `breadth:${key}`,
      lockKey: `breadth_lock:${key}`,
    };
  }
  
  module.exports = { buildBreadthKeys };
  