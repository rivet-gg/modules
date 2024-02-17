import { ScriptContext } from "@ogs/helpers/tokens/revoke.ts";

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

export async function handler(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const query = await ctx.postgres.run((conn) =>
		conn.queryObject<{ id: string; already_revoked: boolean }>`
        WITH pre_update AS (
            SELECT id, revoked_at
            FROM tokens
            WHERE id = ANY(${req.tokenIds})
        )
        UPDATE tokens
        SET revoked_at = timezone('UTC', now())
        FROM pre_update
        WHERE tokens.id = pre_update.id
        RETURNING tokens.id, pre_update.revoked_at IS NOT NULL AS already_revoked
    `
	);

	const updates: Record<string, TokenUpdate> = {};
	for (const tokenId of req.tokenIds) {
		const tokenRow = query.rows.find((row) => row.id === tokenId);
		if (tokenRow) {
			updates[tokenId] = tokenRow.already_revoked
				? TokenUpdate.AlreadyRevoked
				: TokenUpdate.Revoked;
		} else {
			updates[tokenId] = TokenUpdate.NotFound;
		}
	}

	return { updates };
}
