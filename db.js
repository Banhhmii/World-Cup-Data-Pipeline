const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool({
  connectionString: config.pgConnectionString,
  options: `-c search_path=${config.dbSchema}`,
});

module.exports = pool;
