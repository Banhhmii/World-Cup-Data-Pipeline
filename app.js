const express = require("express");
const path = require("path");

const { loggingMiddleware } = require("./middleware/logging");
const { rateLimiter } = require("./middleware/rateLimiter");
const pool = require("./db");
const redisClient = require("./redisClient");

const app = express();

app.use(express.json());
app.use(loggingMiddleware);
app.use(express.static(path.join(__dirname, "views")));

app.get("/players", rateLimiter, async (req, res) => {
  try {
    try {
      const cachedPlayers = await redisClient.get("players");
      if (cachedPlayers) {
        console.log("Returning cached players");
        return res.json(JSON.parse(cachedPlayers));
      }
    } catch (error) {
      console.error("Error fetching from Redis:", error);
    }

    const playerResult = await pool.query("SELECT * FROM player");
    const goalkeeperResult = await pool.query("SELECT * FROM goalkeepers");
    const players = playerResult.rows;
    const goalkeepers = goalkeeperResult.rows;
    const payload = { players, goalkeepers };

    try {
      await redisClient.set("players", JSON.stringify(payload), {
        EX: 3600,
      });
    } catch (error) {
      console.error("Error caching players in Redis:", error);
    }

    res.json(payload);
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = { app };
