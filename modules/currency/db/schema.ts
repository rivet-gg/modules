import { schema, Query } from "./schema.gen.ts";

export const userWallets = schema.table("user_wallets", {
	userId: Query.uuid("user_id").primaryKey().defaultRandom(),
	balance: Query.integer("balance").notNull(),
});

