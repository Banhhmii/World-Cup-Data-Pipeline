require("dotenv").config();

const nodeEnv = process.env.NODE_ENV || "development";

module.exports = {
  nodeEnv,
  port: process.env.PORT || 3000,
  pgConnectionString: process.env.PG_CONNECTION_STRING,
  redisUrl: process.env.REDIS_URL,
  dbSchema: nodeEnv === "test" ? "test" : "public",
};
