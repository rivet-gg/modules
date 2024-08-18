import { schema, Query } from "./schema.gen.ts";

export const dbEntry = schema.table("db_entry", {
  id: Query.uuid("id").primaryKey().defaultRandom(),
  test2: Query.text("string")
});

export const dbEntry2 = schema.table("db_entry2", {
  id: Query.uuid("id").primaryKey().defaultRandom(),
  test2: Query.text("string")
});

