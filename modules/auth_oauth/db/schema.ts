import { schema, Query } from "./schema.gen.ts";

export const loginAttempts = schema.table("login_attempts", {
	id: Query.uuid("id").primaryKey().defaultRandom(),
    
    providerId: Query.text("provider_id").notNull(),
    state: Query.text("state").notNull(),
    codeVerifier: Query.text("code_verifier").notNull(),

    identifier: Query.text("identifier"),
    tokenData: Query.jsonb("token_data"),

    actionData: Query.jsonb("action_data"),

    startedAt: Query.timestamp("started_at").defaultNow().notNull(),
    expiresAt: Query.timestamp("expires_at").notNull(),
    completedAt: Query.timestamp("completed_at"),
    invalidatedAt: Query.timestamp("invalidated_at"),
});