process.env.NODE_ENV = "test";

jest.mock("./redisClient", () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const { app } = require("./app");
const pool = require("./db");
const redisClient = require("./redisClient");

const seedPlayer = {
  name: "Seed Player",
  age: 26,
  country: "Seedland",
  position: "FW",
  goals: 7,
  goals_per_90: 0.6,
  assists: 3,
  yellow_cards: 0,
  red_cards: 0,
  points_per_game: 2.8,
};

const seedGoalkeeper = {
  name: "Seed Keeper",
  age: 29,
  country: "Seedland",
  position: "GK",
  saves: 12,
  saves_pct: 75.5,
  goals_conceded: 5,
  goals_conceded_per_90: 0.9,
  clean_sheets: 4,
};

beforeAll(async () => {
  await pool.query("TRUNCATE TABLE player, goalkeepers RESTART IDENTITY CASCADE");
  await pool.query(
    `INSERT INTO player (name, age, country, position, goals, goals_per_90, assists, yellow_cards, red_cards, points_per_game)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    Object.values(seedPlayer)
  );
  await pool.query(
    `INSERT INTO goalkeepers (name, age, country, position, saves, saves_pct, goals_conceded, goals_conceded_per_90, clean_sheets)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    Object.values(seedGoalkeeper)
  );
});

afterAll(async () => {
  await pool.query("TRUNCATE TABLE player, goalkeepers RESTART IDENTITY CASCADE");
  await pool.end();
});

beforeEach(() => {
  redisClient.get.mockResolvedValue(null);
});

describe("GET /players", () => {
  it("returns players and goalkeepers from the database on a cache miss", async () => {
    const response = await request(app).get("/players");

    expect(response.status).toBe(200);
    expect(response.body.players).toHaveLength(1);
    expect(response.body.goalkeepers).toHaveLength(1);
    expect(response.body.players[0].name).toBe("Seed Player");
    expect(response.body.goalkeepers[0].name).toBe("Seed Keeper");
    expect(redisClient.set).toHaveBeenCalled();
  });

  it("returns the cached payload on a cache hit without querying the database", async () => {
    const cachedPayload = { players: [{ name: "Cached Player" }], goalkeepers: [] };
    redisClient.get.mockResolvedValueOnce(JSON.stringify(cachedPayload));

    const response = await request(app).get("/players");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(cachedPayload);
  });
});
