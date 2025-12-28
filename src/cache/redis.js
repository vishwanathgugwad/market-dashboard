// src/cache/redis.js
const { createClient } = require("redis");

let clientPromise = null;

function getRedis() {
  if (clientPromise) return clientPromise;

  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const client = createClient({ url });

  client.on("error", (err) => {
    console.error("Redis client error:", err);
  });

  clientPromise = (async () => {
    if (!client.isOpen) {
      await client.connect();
    }
    return client;
  })();

  return clientPromise;
}

module.exports = { getRedis };
