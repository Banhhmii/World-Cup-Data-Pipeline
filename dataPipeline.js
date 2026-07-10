const fs = require("fs");
const parse = require("csv-parser");
const { Pool } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
});

const csvData = "./data/players.csv";

const players = [];

fs.createReadStream(csvData)
  .pipe(parse({ columns: true, delimiter: "," }))
  .on("data", (row) => {
    players.push(row);
  })
  .on("error", (error) => {
    console.error("Error reading CSV file:", error);
  })
  .on("end", () => {
    const transformedPlayers = players.map(transformPlayerData);
    console.log("Successfully read and transformed player data from CSV");
    storeAllPlayers(transformedPlayers).catch((error) => {
      console.error("Error storing player data:", error);
    });
  });

const transformPlayerData = (player) => {
  if (player.position === "GK") {
    return {
      name: player.player,
      age: parseInt(player.age, 10),
      country: player.team_country,
      position: player.position,
      saves: parseInt(player.gk_saves, 10) || 0,
      saves_pct: parseFloat(player.gk_saves_pct) || 0,
      goals_conceded: parseInt(player.gk_goals_against, 10) || 0,
      goals_conceded_per_90: parseFloat(player.gk_goals_against_per90) || 0,
      clean_sheets: parseInt(player.gk_clean_sheets, 10) || 0,
    };
  } else {
    return {
      name: player.player,
      age: parseInt(player.age, 10),
      country: player.team_country,
      position: player.position,
      goals: parseInt(player.goals, 10) || 0,
      goals_per_90: parseFloat(player.goals_per90) || 0,
      assists: parseInt(player.assists, 10) || 0,
      yellow_cards: parseInt(player.cards_yellow, 10) || 0,
      red_cards: parseInt(player.cards_red, 10) || 0,
      points_per_game: parseFloat(player.points_per_game) || 0,
    };
  }
};

const storePlayerBatch = async (players) => {
  if (players.length === 0) {
    console.log("No players to store.");
    return;
  }
  const columns = [
    "name",
    "age",
    "country",
    "position",
    "goals",
    "goals_per_90",
    "assists",
    "yellow_cards",
    "red_cards",
    "points_per_game",
  ];

  const values = [];
  const rows = players.map((player, index) => {
    const base = index * columns.length;
    values.push(
      player.name,
      player.age,
      player.country,
      player.position,
      player.goals,
      player.goals_per_90,
      player.assists,
      player.yellow_cards,
      player.red_cards,
      player.points_per_game,
    );
    return `(${columns.map((_, i) => `$${base + i + 1}`).join(", ")})`;
  });

  const query = `INSERT INTO player (${columns.join(", ")}) VALUES ${rows.join(", ")}`;

  try {
    await pool.query(query, values);
    console.log("Batch of players inserted successfully.");
  } catch (error) {
    console.error("Error inserting batch of players:", error);
  }
};

const storeGoalkeeperBatch = async (goalkeepers) => {
  if (goalkeepers.length === 0) {
    console.log("No goalkeepers to store.");
    return;
  }
  const columns = [
    "name",
    "age",
    "country",
    "position",
    "saves",
    "saves_pct",
    "goals_conceded",
    "goals_conceded_per_90",
    "clean_sheets",
  ];

  const values = [];
  const rows = goalkeepers.map((goalkeeper, index) => {
    const base = index * columns.length;
    values.push(
      goalkeeper.name,
      goalkeeper.age,
      goalkeeper.country,
      goalkeeper.position,
      goalkeeper.saves,
      goalkeeper.saves_pct,
      goalkeeper.goals_conceded,
      goalkeeper.goals_conceded_per_90,
      goalkeeper.clean_sheets,
    );
    return `(${columns.map((_, i) => `$${base + i + 1}`).join(", ")})`;
  });

  const query = `INSERT INTO goalkeepers (${columns.join(", ")}) VALUES ${rows.join(", ")}`;

  try {
    await pool.query(query, values);
    console.log("Batch of goalkeepers inserted successfully.");
  } catch (error) {
    console.error("Error inserting batch of goalkeepers:", error);
  }
};

const storeAllPlayers = async (players) => {
  const playerData = players.filter((player) => player.position !== "GK");
  const goalkeeperData = players.filter((player) => player.position === "GK");
  try {
    await storePlayerBatch(playerData);
    await storeGoalkeeperBatch(goalkeeperData);
    console.log("All player data stored successfully.");
  } catch (error) {
    console.error("Error storing all player data:", error);
  }
};
