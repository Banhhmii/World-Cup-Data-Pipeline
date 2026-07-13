# World Cup Player Stats Pipeline
> A CSV-to-Postgres data pipeline with a Redis-cached API for exploring World Cup player and goalkeeper stats.

[Live demo](https://world-cup-data-pipeline.onrender.com) · [GitHub](https://github.com/Banhhmii/World-Cup-Data-Pipeline)

---

## The Problem

Raw World Cup player stats sit in a flat CSV file — nothing structured or queryable exposes them. Outfield players and goalkeepers also need different stat shapes (goals/assists vs. saves/clean sheets), which a single flat table can't represent well.

## The Solution

An ingestion pipeline reads and validates the CSV, splits rows into players vs. goalkeepers, and batch-inserts them into normalized Postgres tables. A Redis-cached `GET /players` endpoint serves the data, and a small vanilla-JS frontend renders it into stat cards.

---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no framework)
- **Backend:** Node.js, Express 5
- **Database:** PostgreSQL (Supabase), Knex for migrations
- **Cache:** Redis (cache-aside, 1hr TTL on `/players`)
- **Deployment:** Render
- **Other:** Jest + Supertest (13 tests against an isolated Postgres `test` schema), `csv-parser` for ingestion, `express-rate-limit` (100 req/15min on `/players`)

## Key Features

- CSV ingestion pipeline that validates and transforms rows into player/goalkeeper shapes
- Fail-soft batch inserts — `Promise.allSettled` means one table's bad batch doesn't block the other
- Redis-cached `GET /players` endpoint with a 1-hour TTL
- Rate-limited API and structured request logging
- 13 automated tests, including a real Postgres-constraint failure test, run against an isolated schema so tests never touch production data

---

## Setup (Run Locally)

### Prerequisites
- Node.js v18+
- A PostgreSQL instance (e.g. Supabase)
- A Redis instance

### Installation

Clone the repo
```
git clone https://github.com/Banhhmii/World-Cup-Data-Pipeline.git
cd World-Cup-Data-Pipeline
```

Install dependencies
```
npm install
```

Set up environment variables
```
cp .env.example .env
# Then edit .env with your values
```

Run migrations
```
npm run migrate
```

Load the CSV data (one-time)
```
node dataPipeline.js
```

Start the server
```
npm start
```

Optional — run the test suite
```
npm test
```
Runs against an isolated `test` Postgres schema (auto-created and migrated by `jest.globalSetup.js`) — never touches your `public` data.

### Environment Variables

See `.env.example` for the full list. You'll need:
- `PG_CONNECTION_STRING` — Postgres connection string
- `REDIS_URL` — Redis connection string
- `PORT` — optional, defaults to 3000

---

## What I Learned

- Getting Redis to connect wasn't working at first — I dug into the docs instead of guessing, got the cache-aside pattern working, and later confirmed it end-to-end: I hit `GET /players` twice, saw the first call read from Postgres and the second return `Returning cached players` from the Redis cache.
- Writing `renderPlayers` and the fail-soft batch summary from scratch (rather than working from a diff) was a deliberate drill, and it was a struggle, but it's the kind of thing that sticks once you've actually typed it yourself instead of reading someone else's version.

## Credits

Built by Tommy Ngo as part of my self-taught journey into software engineering.

- https://www.linkedin.com/in/tommy-ngo1
