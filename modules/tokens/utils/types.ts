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


export function withoutKeys<T extends object, K extends keyof T>(
	obj: T,
	keys: K[]
): Omit<T, K> {
	const copy = { ...obj };
	for (const key of keys) {
		delete copy[key];
	}
	return copy;
}

export function tokenFromRowWithSecret(
	row: prisma.Prisma.TokenGetPayload<any>,
	origToken: string
): TokenWithSecret {
	return {
		...tokenFromRow(row),
		token: origToken,
	}
}

export function tokenFromRow(
	row: prisma.Prisma.TokenGetPayload<any>,
): Token {
	return {
		...withoutKeys(row, ["tokenHash"]),
		createdAt: row.createdAt.toISOString(),
		expireAt: row.expireAt?.toISOString() ?? null,
		revokedAt: row.revokedAt?.toISOString() ?? null,
	};
}

export async function hash(token: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(token);
	const hash = await crypto.subtle.digest("SHA-256", data);
	const digest = Array.from(new Uint8Array(hash));
	const strDigest = digest.map(b => b.toString(16).padStart(2, "0")).join("");
	return strDigest;
}
