/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable("Users", (table) => {
    table.increments("id").primary();
    table.string("username").notNullable().unique();
    table.string("password").notNullable().checkLength("password", 8, 64);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  }).then(() => {
    console.log("Users table created successfully");
});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTableIfExists("Users").then(() => {
        console.log("Users table dropped successfully");
   });
};
