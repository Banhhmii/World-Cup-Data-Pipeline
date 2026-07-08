/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('player', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.integer('age').notNullable();
    table.string('country').notNullable();
    table.string('position').notNullable();
    table.float('goals', 10, 2).notNullable();
    table.float('goals_per_90', 10, 2).notNullable();
    table.integer('assists').notNullable();
    table.integer('yellow_cards').notNullable();
    table.integer('red_cards').notNullable();
    table.float('points_per_game', 10, 2).notNullable();

  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('player');
  
};
