/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable("player", (table) => {
    table.unique(["name", "country"]);
  });
  await knex.schema.alterTable("goalkeepers", (table) => {
    table.unique(["name", "country"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("player", (table) => {
    table.dropUnique(["name", "country"]);
  });
  await knex.schema.alterTable("goalkeepers", (table) => {
    table.dropUnique(["name", "country"]);
  });
};
