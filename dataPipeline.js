const fs = require("fs");
const parse = require("csv-parser");
const pool = require("./db");

const csvData = "./data/players.csv";

// For 1000+ players total
const PLAYER_BATCH_SIZE = 200;
// For 100+ goalkeepers in total
const GOALKEEPER_BATCH_SIZE = 30;

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

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

const filterValidPlayers = (players) => {
  return players.filter((player) => {
    if (Number.isNaN(player.age)) {
      console.error(`Skipping ${player.name}: invalid age`);
      return false;
    }
    return true;
  });
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

  const chunks = chunkArray(players, PLAYER_BATCH_SIZE);
  const errors = [];
  let insertedCount = 0;

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const values = [];
    const rows = chunk.map((player, index) => {
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
      insertedCount += chunk.length;
    } catch (error) {
      console.error(
        `Error inserting player chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} rows):`,
        error,
      );
      errors.push({ chunkIndex, error });
    }
  }

  if (errors.length > 0) {
    const aggregateError = new Error(
      `${errors.length} of ${chunks.length} player chunk(s) failed to insert.`,
    );
    aggregateError.insertedRows = insertedCount;
    aggregateError.totalRows = players.length;
    aggregateError.chunkErrors = errors;
    throw aggregateError;
  }

  console.log(
    `Batch of players inserted successfully (${players.length} rows in ${chunks.length} chunk(s)).`,
  );
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

  const chunks = chunkArray(goalkeepers, GOALKEEPER_BATCH_SIZE);
  const errors = [];
  let insertedCount = 0;

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const values = [];
    const rows = chunk.map((goalkeeper, index) => {
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
      insertedCount += chunk.length;
    } catch (error) {
      console.error(
        `Error inserting goalkeeper chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} rows):`,
        error,
      );
      errors.push({ chunkIndex, error });
    }
  }

  if (errors.length > 0) {
    const aggregateError = new Error(
      `${errors.length} of ${chunks.length} goalkeeper chunk(s) failed to insert.`,
    );
    aggregateError.insertedRows = insertedCount;
    aggregateError.totalRows = goalkeepers.length;
    aggregateError.chunkErrors = errors;
    throw aggregateError;
  }

  console.log(
    `Batch of goalkeepers inserted successfully (${goalkeepers.length} rows in ${chunks.length} chunk(s)).`,
  );
};

const storeAllPlayers = async (players) => {
  const playerData = players.filter((player) => player.position !== "GK");
  const goalkeeperData = players.filter((player) => player.position === "GK");
  const result =  await Promise.allSettled([
    storePlayerBatch(playerData),
    storeGoalkeeperBatch(goalkeeperData),
  ]);

  const [playerResult, goalkeeperResult] = result;
  const playerStatus = playerResult.status === "fulfilled"
    ? `inserted (${playerData.length})`
    : `FAILED (${playerResult.reason.message})${playerResult.reason.insertedRows ? ` — ${playerResult.reason.insertedRows}/${playerResult.reason.totalRows} rows committed` : ""}`;
  const goalkeeperStatus = goalkeeperResult.status === "fulfilled"
    ? `inserted (${goalkeeperData.length})`
    : `FAILED (${goalkeeperResult.reason.message})${goalkeeperResult.reason.insertedRows ? ` — ${goalkeeperResult.reason.insertedRows}/${goalkeeperResult.reason.totalRows} rows committed` : ""}`;

  console.log(`Players: ${playerStatus} | Goalkeepers: ${goalkeeperStatus}`);

  if(playerResult.status === "rejected" || goalkeeperResult.status === "rejected") {
    throw new Error("One or more batches failed to store — see summary above.");
  }

};

const runPipeline = () => {
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
      const validPlayers = filterValidPlayers(transformedPlayers);
      console.log("Successfully read and transformed player data from CSV");
      storeAllPlayers(validPlayers).catch((error) => {
        console.error("Error storing player data:", error);
      });
    });
};

if (require.main === module) {
  runPipeline();
}

module.exports = {
  transformPlayerData,
  filterValidPlayers,
  storePlayerBatch,
  storeGoalkeeperBatch,
  storeAllPlayers,
  PLAYER_BATCH_SIZE,
  GOALKEEPER_BATCH_SIZE,
};
