import { prisma } from "../module.gen.ts";

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
	row: prisma.Prisma.TokenGetPayload<any>,
): TokenWithSecret {
	return {
		...row,
		// NOTE: Not sure why this is necessary— prisma seems to be stringifying
		// all JSON values before returning them.
		//
		// Should look into more.
		meta: row.meta ? JSON.parse(row.meta.toString()) : row.meta,
		createdAt: row.createdAt.toISOString(),
		expireAt: row.expireAt?.toISOString() ?? null,
		revokedAt: row.revokedAt?.toISOString() ?? null,
	};
}
