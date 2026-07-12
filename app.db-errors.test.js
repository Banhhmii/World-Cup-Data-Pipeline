process.env.NODE_ENV = "test";

jest.mock("./db", () => ({
  query: jest.fn().mockRejectedValue(new Error("simulated db outage — must never reach the client")),
  end: jest.fn(),
}));

jest.mock("./redisClient", () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const { app } = require("./app");

describe("GET /players when the database is down", () => {
  it("responds with a generic 500 error and never leaks the real error", async () => {
    const response = await request(app).get("/players");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
    expect(JSON.stringify(response.body)).not.toContain("simulated db outage");
  });
});
