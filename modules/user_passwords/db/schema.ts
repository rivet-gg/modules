import { Query, schema } from "./schema.gen.ts";

export const passwords = schema.table("passwords", {
	userId: Query.uuid("user_id").primaryKey(),
	passwordHash: Query.text("password_hash").notNull(),
	algo: Query.text("algo").notNull(),
});
