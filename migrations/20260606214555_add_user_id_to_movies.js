/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // First, add column as nullable
  await knex.schema.table("Movies", function(table) {
    table.integer("user_id").unsigned().notNullable().references("id").inTable("Users").onDelete("CASCADE");
  });

};
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table("Movies", function(table) {
    table.dropForeign("user_id");
    table.dropColumn("user_id");
  });
};
