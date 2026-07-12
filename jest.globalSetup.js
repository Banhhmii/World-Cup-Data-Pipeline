const knex = require("knex");
const knexConfig = require("./knexfile");

module.exports = async function globalSetup() {
  const db = knex(knexConfig.test);
  try {
    await db.raw("CREATE SCHEMA IF NOT EXISTS test");
    await db.migrate.latest();
  } finally {
    await db.destroy();
  }
};
