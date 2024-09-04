import { Database } from "../module.gen.ts";

export interface Token {
	id: string;
	type: string;
	meta: any;
	createdAt: string;
	expireAt: string | null;
	revokedAt: string | null;
}

export interface TokenWithSecret extends Token {
	token: string;
}

export function tokenFromRow(
	row: typeof Database.tokens.$inferSelect
): TokenWithSecret {
	return {
		...row,
		createdAt: row.createdAt.toISOString(),
		expireAt: row.expireAt?.toISOString() ?? null,
		revokedAt: row.revokedAt?.toISOString() ?? null,
	};
}