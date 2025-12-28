function buildBreadthCacheKey({ indexName, interval, date, fromTime, toTime }) {
  const key = `${String(indexName || "").toUpperCase()}|${interval}|${date}|${fromTime}|${toTime}`;
  return {
    cacheKey: `breadth:${key}`,
    lockKey: `breadth_lock:${key}`,
  };
}

module.exports = {
  buildBreadthCacheKey,
};
