// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */

require("dotenv").config();
module.exports = {

  development: {
    client: 'pg',
    connection: {
      connectionString: process.env.PG_CONNECTION_STRING
    }
  },

  test: {
    client: 'pg',
    connection: {
      connectionString: process.env.PG_CONNECTION_STRING
    },
    searchPath: ['test'],
    migrations: {
      tableName: 'knex_migrations'
    }
  },


  production: {
    client: 'postgresql',
    connection: {
      connectionString: process.env.PG_CONNECTION_STRING
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

};
