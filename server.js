const express = require("express");
const { Pool } = require("pg");
const  redis  = require("redis");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
});

const redisClient = redis.createClient({url: process.env.REDIS_URL});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

redisClient.connect().catch((err) => {
  console.error("Error connecting to Redis:", err);
});

app.get("/", (req, res) => {
  res.send("Welcome to the World Cup Data API");
});

app.get("/players", async (req, res) => {
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

    await redisClient.set("players", JSON.stringify({ players, goalkeepers }), {
      EX: 3600,
    });
    await redisClient.set("goalkeepers", JSON.stringify(goalkeepers), {
      EX: 3600,
    });
    res.json({
      players: players,
      goalkeepers: goalkeepers,
    });

  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
