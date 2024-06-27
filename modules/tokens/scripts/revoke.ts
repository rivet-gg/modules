import { ScriptContext } from "../module.gen.ts";

export interface Request {
	tokenIds: string[];
}

export interface Response {
	updates: { [key: string]: TokenUpdate };
}

export enum TokenUpdate {
	Revoked = "REVOKED",
	AlreadyRevoked = "ALREADY_REVOKED",
	NotFound = "NOT_FOUND",
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	interface TokenRow {
		id: string;
		alreadyRevoked: boolean;
	}

	// Sets revokedAt on all tokens that have not already been revoked. Returns
	// wether or not each token was revoked.
	const rows = await ctx.db.$queryRawUnsafe<TokenRow[]>(
    `
		WITH "PreUpdate" AS (
			SELECT "id", "revokedAt"
			FROM "${ctx.dbSchema}"."Token"
			WHERE "id" = ANY($1)
		)
		UPDATE "${ctx.dbSchema}"."Token"
		SET "revokedAt" = COALESCE("Token"."revokedAt", current_timestamp)
		FROM "PreUpdate"
		WHERE "Token"."id" = "PreUpdate"."id"
		RETURNING "Token"."id" AS "id", "PreUpdate"."revokedAt" IS NOT NULL AS "alreadyRevoked"
    `,
    req.tokenIds,
  );

	const updates: Record<string, TokenUpdate> = {};
	for (const tokenId of req.tokenIds) {
		const tokenRow = rows.find((row) => row.id === tokenId);
		if (tokenRow) {
			updates[tokenId] = tokenRow.alreadyRevoked
				? TokenUpdate.AlreadyRevoked
				: TokenUpdate.Revoked;
		} else {
			updates[tokenId] = TokenUpdate.NotFound;
		}
	}

	return { updates };
}
