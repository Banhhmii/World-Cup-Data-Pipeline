const fs = require("fs");
const parse = require("csv-parser");
const pool = require("./db");

const csvData = "./data/players.csv";

// For 1000+ players total for volume of data
const PLAYER_BATCH_SIZE = 200;
// For 100+ goalkeepers in total for volume of data
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

const storeBatch = async ({players, tableName, columns, batchSize, conflictColumns}) => {
  if (players.length === 0) {
    console.log(`No ${tableName} to store.`);
    return;
  }

  const chunks = chunkArray(players, batchSize);
  const errors = [];
  let insertedCount = 0;

  const updateColumns = columns.filter((col) => !conflictColumns.includes(col));
  const conflictClause = ` ON CONFLICT (${conflictColumns.join(", ")}) DO UPDATE SET ${updateColumns
    .map((col) => `${col} = EXCLUDED.${col}`)
    .join(", ")}`;

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const values = [];
    const rows = chunk.map((player, index) => {
      const base = index * columns.length;
      values.push(...columns.map(col => player[col]));
      return `(${columns.map((_, i) => `$${base + i + 1}`).join(", ")})`;
    });

    const query = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES ${rows.join(", ")}${conflictClause}`;

    try {
      await pool.query(query, values);
      insertedCount += chunk.length;
    } catch (error) {
      console.error(
        `Error inserting ${tableName} chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} rows):`,
        error,
      );
      errors.push({ chunkIndex, error });
    }
  }

  if (errors.length > 0) {
    const aggregateError = new Error(
      `${errors.length} of ${chunks.length} ${tableName} chunk(s) failed to insert.`,
    );
    aggregateError.insertedRows = insertedCount;
    aggregateError.totalRows = players.length;
    aggregateError.chunkErrors = errors;
    throw aggregateError;
  }

  console.log(
    `Batch of ${tableName} inserted successfully (${players.length} rows in ${chunks.length} chunk(s)).`,
  );
}


const storeAllPlayers = async (players) => {
  const playerData = players.filter((player) => player.position !== "GK");
  const goalkeeperData = players.filter((player) => player.position === "GK");
  const result =  await Promise.allSettled([
    storeBatch({
      players: playerData,
      tableName: "player",
      columns: [
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
      ],
      batchSize: PLAYER_BATCH_SIZE,
      conflictColumns: ["name", "country"],
    }),
    storeBatch({
      players: goalkeeperData,
      tableName: "goalkeepers",
      columns: [
        "name",
        "age",
        "country",
        "position",
        "saves",
        "saves_pct",
        "goals_conceded",
        "goals_conceded_per_90",
        "clean_sheets",
      ],
      batchSize: GOALKEEPER_BATCH_SIZE,
      conflictColumns: ["name", "country"],
    }),
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
  storeBatch,
  storeAllPlayers,
  PLAYER_BATCH_SIZE,
  GOALKEEPER_BATCH_SIZE,
};
