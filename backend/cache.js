// cache.js
import Redis from "ioredis";

// Connect to Redis (default host: 127.0.0.1, port: 6379)
const redis = new Redis();

// Test connection
redis.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redis.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

export default redis;
