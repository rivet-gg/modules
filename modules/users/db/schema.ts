import { Query, schema } from "./schema.gen.ts";

export const users = schema.table("users", {
	id: Query.uuid("id").primaryKey().defaultRandom(),
	username: Query.text("token").unique().notNull(),
	createdAt: Query.timestamp("created_at").defaultNow().notNull(),
	updatedAt: Query.timestamp("updated_at").notNull().$onUpdate(() =>
		new Date()
	),
});
