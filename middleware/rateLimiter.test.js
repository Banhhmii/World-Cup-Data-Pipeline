const express = require("express");
const request = require("supertest");
const { rateLimiter } = require("./rateLimiter");

describe("rateLimiter", () => {
  it("allows requests under the limit and blocks the request after the max", async () => {
    const app = express();
    app.get("/ping", rateLimiter, (req, res) => res.json({ ok: true }));

    let lastResponse;
    for (let i = 0; i < 101; i++) {
      lastResponse = await request(app).get("/ping");
    }

    expect(lastResponse.status).toBe(429);
    expect(lastResponse.text).toContain("Too many requests");
  }, 20000);
});
