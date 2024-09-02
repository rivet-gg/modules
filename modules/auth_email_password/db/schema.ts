import { schema, Query } from "./schema.gen.ts";

export const verifications = schema.table('verifications', {
  id: Query.uuid("id").primaryKey().defaultRandom(),

  email: Query.text("email").notNull(),

  code: Query.text("code").notNull().unique(),
  token: Query.text("token").notNull().unique(),

  attemptCount: Query.integer("attempt_count").notNull().default(0),
  maxAttemptCount: Query.integer("max_attempt_count").notNull(),

  createdAt: Query.timestamp("created_at").notNull().defaultNow(),
  expireAt: Query.timestamp("expire_at").notNull(),
  completedAt: Query.timestamp("completed_at"),
});

