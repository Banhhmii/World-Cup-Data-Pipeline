/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('goalkeepers', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.integer('age').notNullable();
    table.string('country').notNullable();
    table.string('position', 50).notNullable();
    table.integer('saves').notNullable();
    table.float('saves_pct').notNullable();
    table.integer('goals_conceded').notNullable();
    table.float('goals_conceded_per_90', 10, 2).notNullable();
    table.integer('clean_sheets').notNullable();
    table
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('goalkeepers');
};
