import { sql } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";

export const user = pgTable("users", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	username: text("username").unique().notNull(),
});
