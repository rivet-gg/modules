import { Query, schema } from "./schema.gen.ts";

export const friends = schema.table("friends", {
	userIdA: Query.uuid("user_id_a").notNull(),
	userIdB: Query.uuid("user_id_b").notNull(),
	friendRequestId: Query.uuid("friend_request_id").notNull(),
	createdAt: Query.timestamp("created_at").defaultNow().notNull(),
	removedAt: Query.timestamp("removed_at"),
}, (table) => ({
	pk: Query.primaryKey({ columns: [table.userIdA, table.userIdB] }),
}));

export const friendRequests = schema.table("friend_requests", {
	id: Query.uuid("id").primaryKey().defaultRandom(),
	senderUserId: Query.uuid("sender_user_id").notNull(),
	targetUserId: Query.uuid("target_user_id").notNull(),
	createdAt: Query.timestamp("created_at").defaultNow().notNull(),
	declinedAt: Query.timestamp("declined_at"),
	acceptedAt: Query.timestamp("accepted_at"),
});
