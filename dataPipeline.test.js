process.env.NODE_ENV = "test";

const pool = require("./db");
const {
  transformPlayerData,
  filterValidPlayers,
  storeBatch,
  storeAllPlayers,
  PLAYER_BATCH_SIZE,
  GOALKEEPER_BATCH_SIZE,
} = require("./dataPipeline");

const PLAYER_COLUMNS = [
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

const GOALKEEPER_COLUMNS = [
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

const storePlayerBatch = (players) =>
  storeBatch({
    players,
    tableName: "player",
    columns: PLAYER_COLUMNS,
    batchSize: PLAYER_BATCH_SIZE,
    conflictColumns: ["name", "country"],
  });

const storeGoalkeeperBatch = (goalkeepers) =>
  storeBatch({
    players: goalkeepers,
    tableName: "goalkeepers",
    columns: GOALKEEPER_COLUMNS,
    batchSize: GOALKEEPER_BATCH_SIZE,
    conflictColumns: ["name", "country"],
  });

describe("transformPlayerData (pure)", () => {
  it("maps a goalkeeper row into the goalkeeper shape", () => {
    const row = {
      player: "Alisson",
      age: "31",
      team_country: "Brazil",
      position: "GK",
      gk_saves: "42",
      gk_saves_pct: "78.5",
      gk_goals_against: "18",
      gk_goals_against_per90: "1.2",
      gk_clean_sheets: "9",
    };

    expect(transformPlayerData(row)).toEqual({
      name: "Alisson",
      age: 31,
      country: "Brazil",
      position: "GK",
      saves: 42,
      saves_pct: 78.5,
      goals_conceded: 18,
      goals_conceded_per_90: 1.2,
      clean_sheets: 9,
    });
  });

  it("maps an outfield row into the player shape", () => {
    const row = {
      player: "Mbappe",
      age: "25",
      team_country: "France",
      position: "FW",
      goals: "8",
      goals_per90: "1.1",
      assists: "2",
      cards_yellow: "1",
      cards_red: "0",
      points_per_game: "3.4",
    };

    expect(transformPlayerData(row)).toEqual({
      name: "Mbappe",
      age: 25,
      country: "France",
      position: "FW",
      goals: 8,
      goals_per_90: 1.1,
      assists: 2,
      yellow_cards: 1,
      red_cards: 0,
      points_per_game: 3.4,
    });
  });

  it("defaults missing numeric fields to 0 rather than NaN", () => {
    const row = {
      player: "Unknown",
      age: "22",
      team_country: "Nowhere",
      position: "FW",
    };

    const result = transformPlayerData(row);
    expect(result.goals).toBe(0);
    expect(result.goals_per_90).toBe(0);
    expect(result.assists).toBe(0);
  });
});

describe("filterValidPlayers (pure)", () => {
  it("drops players with a NaN age and keeps the rest", () => {
    const players = [
      { name: "Valid", age: 24 },
      { name: "Invalid", age: NaN },
    ];

    expect(filterValidPlayers(players)).toEqual([{ name: "Valid", age: 24 }]);
  });

  it("keeps all players when every age is valid", () => {
    const players = [
      { name: "A", age: 20 },
      { name: "B", age: 30 },
    ];

    expect(filterValidPlayers(players)).toEqual(players);
  });
});

describe("batch storage (real test DB)", () => {
  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE player, goalkeepers RESTART IDENTITY CASCADE");
  });

  afterAll(async () => {
    await pool.query("TRUNCATE TABLE player, goalkeepers RESTART IDENTITY CASCADE");
    await pool.end();
  });

  const validPlayer = {
    name: "Test Player",
    age: 24,
    country: "Testland",
    position: "FW",
    goals: 5,
    goals_per_90: 0.5,
    assists: 2,
    yellow_cards: 1,
    red_cards: 0,
    points_per_game: 2.1,
  };

  const validGoalkeeper = {
    name: "Test Keeper",
    age: 28,
    country: "Testland",
    position: "GK",
    saves: 10,
    saves_pct: 70.0,
    goals_conceded: 4,
    goals_conceded_per_90: 0.8,
    clean_sheets: 3,
  };

  it("storePlayerBatch inserts rows into the player table", async () => {
    await storePlayerBatch([validPlayer]);
    const { rows } = await pool.query("SELECT * FROM player");
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Test Player");
  });

  it("storeGoalkeeperBatch inserts rows into the goalkeepers table", async () => {
    await storeGoalkeeperBatch([validGoalkeeper]);
    const { rows } = await pool.query("SELECT * FROM goalkeepers");
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Test Keeper");
  });

  it("storeAllPlayers commits the successful batch and throws when the other fails", async () => {
    const brokenGoalkeeper = { ...validGoalkeeper, name: null }; // violates notNullable

    await expect(
      storeAllPlayers([validPlayer, brokenGoalkeeper])
    ).rejects.toThrow("One or more batches failed to store");

    const playerRows = await pool.query("SELECT * FROM player");
    const goalkeeperRows = await pool.query("SELECT * FROM goalkeepers");
    expect(playerRows.rows).toHaveLength(1);
    expect(goalkeeperRows.rows).toHaveLength(0);
  });

  const buildPlayers = (count) =>
    Array.from({ length: count }, (_, i) => ({
      ...validPlayer,
      name: `Test Player ${i}`,
    }));

  const buildGoalkeepers = (count) =>
    Array.from({ length: count }, (_, i) => ({
      ...validGoalkeeper,
      name: `Test Keeper ${i}`,
    }));

  it("chunks a player batch spanning a full chunk plus a partial chunk", async () => {
    const players = buildPlayers(PLAYER_BATCH_SIZE + 50);
    await storePlayerBatch(players);
    const { rows } = await pool.query("SELECT * FROM player");
    expect(rows).toHaveLength(PLAYER_BATCH_SIZE + 50);
  });

  it("chunks a goalkeeper batch spanning a full chunk plus a partial chunk", async () => {
    const goalkeepers = buildGoalkeepers(GOALKEEPER_BATCH_SIZE + 10);
    await storeGoalkeeperBatch(goalkeepers);
    const { rows } = await pool.query("SELECT * FROM goalkeepers");
    expect(rows).toHaveLength(GOALKEEPER_BATCH_SIZE + 10);
  });

  it("issues one INSERT per chunk rather than one INSERT for the whole batch", async () => {
    const querySpy = jest.spyOn(pool, "query");

    await storePlayerBatch(buildPlayers(PLAYER_BATCH_SIZE + 50));
    await storeGoalkeeperBatch(buildGoalkeepers(GOALKEEPER_BATCH_SIZE + 10));

    const playerInserts = querySpy.mock.calls.filter(([sql]) =>
      sql.startsWith("INSERT INTO player")
    );
    const goalkeeperInserts = querySpy.mock.calls.filter(([sql]) =>
      sql.startsWith("INSERT INTO goalkeepers")
    );

    expect(playerInserts).toHaveLength(2);
    expect(goalkeeperInserts).toHaveLength(2);

    querySpy.mockRestore();
  });

  it("moves on to the next chunk instead of aborting after a chunk fails", async () => {
    const players = buildPlayers(PLAYER_BATCH_SIZE + 10);
    players[PLAYER_BATCH_SIZE + 3] = { ...players[PLAYER_BATCH_SIZE + 3], name: null }; // violates notNullable, lands in chunk 2

    await expect(storePlayerBatch(players)).rejects.toThrow(
      "1 of 2 player chunk(s) failed to insert."
    );

    const { rows } = await pool.query("SELECT * FROM player");
    expect(rows).toHaveLength(PLAYER_BATCH_SIZE);
  });

  it("re-inserting the same player upserts instead of duplicating", async () => {
    await storePlayerBatch([validPlayer]);
    const updatedPlayer = { ...validPlayer, goals: 99 };
    await storePlayerBatch([updatedPlayer]);

    const { rows } = await pool.query("SELECT * FROM player");
    expect(rows).toHaveLength(1);
    expect(rows[0].goals).toBe(99);
  });

  it("re-inserting the same goalkeeper upserts instead of duplicating", async () => {
    await storeGoalkeeperBatch([validGoalkeeper]);
    const updatedGoalkeeper = { ...validGoalkeeper, saves: 25 };
    await storeGoalkeeperBatch([updatedGoalkeeper]);

    const { rows } = await pool.query("SELECT * FROM goalkeepers");
    expect(rows).toHaveLength(1);
    expect(rows[0].saves).toBe(25);
  });
});
