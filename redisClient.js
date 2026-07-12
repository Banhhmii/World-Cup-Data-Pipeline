const redis = require("redis");
const config = require("./config");

const redisClient = redis.createClient({ url: config.redisUrl });
redisClient.on("error", (err) => console.error("Redis error:", err));
redisClient.connect().catch((err) => console.error("Error connecting to Redis:", err));

module.exports = redisClient;
