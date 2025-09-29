// cache.js
import Redis from "ioredis";
import dotenv from 'dotenv';
dotenv.config({path:"./.env"});
let redis;
try {
redis = new Redis({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});  
} catch (error) {
  console.log(error.message)
  console.log("Error Connecting  Cloud Redis")
  console.log("FallBack to  local redis server")
  // Connect to Redis (default host: 127.0.0.1, port: 6379)
  redis = new Redis();
}





// Test connection
redis.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redis.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

export default redis;
