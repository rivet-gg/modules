import { schema, Query } from "./schema.gen.ts";

export const verifications = schema.table('verifications', {
  id: Query.uuid("id").primaryKey().defaultRandom(),

  data: Query.jsonb("data").notNull(),

  code: Query.text("code").notNull().unique(),
  token: Query.text("token").notNull().unique(),

  attemptCount: Query.integer("attempt_count").notNull().default(0),
  maxAttemptCount: Query.integer("max_attempt_count").notNull(),

  createdAt: Query.timestamp("created_at").notNull().defaultNow(),
  expireAt: Query.timestamp("expire_at").notNull(),
});

export const oldVerifications = schema.table('old_verifications', {
  id: Query.uuid("id").primaryKey(),

  data: Query.jsonb("data").notNull(),

  code: Query.text("code").notNull().unique(),
  token: Query.text("token").notNull().unique(),

  attemptsCount: Query.integer("attempt_count").notNull(),
  wasCompleted: Query.boolean("was_completed").notNull(),

  createdAt: Query.timestamp("created_at").notNull(),
  invalidatedAt: Query.timestamp("invalidated_at"),
  expiredAt: Query.timestamp("expired_at"),
  completedAt: Query.timestamp("completed_at"),
});

