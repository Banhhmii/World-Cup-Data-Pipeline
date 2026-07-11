const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const  redis  = require("redis");
const dotenv = require("dotenv");
dotenv.config();

const { loggingMiddleware } = require("./middleware/logging");
const { rateLimiter } = require("./middleware/rateLimiter");

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
});

const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.on("error", (err) => console.error("Redis error:", err));
redisClient.connect().catch((err) => console.error("Error connecting to Redis:", err));

app.use(express.json());
app.use(loggingMiddleware);
app.use(express.static(path.join(__dirname, "views")));

app.get("/players", rateLimiter, async (req, res) => {
  try {
    const cachedPlayers = await redisClient.get("players");
    if (cachedPlayers) {
      console.log("Returning cached players");
      return res.json(JSON.parse(cachedPlayers));
    }
    const playerResult = await pool.query("SELECT * FROM player");
    const goalkeeperResult = await pool.query("SELECT * FROM goalkeepers");
    const players = playerResult.rows;
    const goalkeepers = goalkeeperResult.rows;
    const payload = { players, goalkeepers };

    await redisClient.set("players", JSON.stringify(payload), {
      EX: 3600,
    });
    res.json(payload);

  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
