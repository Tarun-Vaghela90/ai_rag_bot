import Redis from "ioredis";


let redis;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
} else {
  console.log("❌ fall back to local redis-server")
  redis = new Redis(); // fallback to localhost
}

// const redis = new Redis();
redis.on("connect", () => {
  console.log("✅ Connected to Redis ");
});

redis.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

export default redis;
