const { createClient } = require("redis");

let client;
let connectPromise;

async function getRedis() {
  if (!client) {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    client = createClient({ url });
    client.on("error", (err) => {
      console.error("Redis client error:", err);
    });
  }

  if (!client.isReady) {
    if (!connectPromise) {
      connectPromise = client.connect().catch((err) => {
        console.error("Failed to connect to Redis:", err);
        throw err;
      });
    }
    await connectPromise;
  }

  return client;
}

module.exports = { getRedis };
