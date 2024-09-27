import { Query, schema } from "./schema.gen.ts";

export const tokens = schema.table("tokens", {
	id: Query.uuid("id").primaryKey().defaultRandom(),
	token: Query.text("token").unique().notNull(),
	type: Query.text("type").notNull(),
	meta: Query.jsonb("meta").notNull(),
	trace: Query.jsonb("trace").notNull(),
	createdAt: Query.timestamp("created_at").defaultNow().notNull(),
	expireAt: Query.timestamp("expire_at"),
	revokedAt: Query.timestamp("revoked_at"),
});
