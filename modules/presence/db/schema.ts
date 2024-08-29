import { schema, Query } from "./schema.gen.ts";

export const myTable = schema.table("my_table", {
	id: Query.uuid("id").primaryKey().defaultRandom(),
	myColumn: Query.text("my_column").notNull(),
	createdAt: Query.timestamp("created_at").notNull().defaultNow(),
	updatedAt: Query.timestamp('updated_at').notNull().$onUpdate(() => new Date()),
});