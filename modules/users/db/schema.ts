import { sql } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	username: text("username").unique().notNull(),
});

export const identities = pgTable("identities", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	userId: uuid("user_id").notNull().references(() => users.id),
});

export const identityGuests = pgTable("identity_guests", {
	identityId: uuid("identity_id").primaryKey().references(() => identities.id),
});

