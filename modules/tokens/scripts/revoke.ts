import { Database, Query, ScriptContext } from "../module.gen.ts";

export interface Request {
	tokenIds: string[];
}

export interface Response {
	updates: { [key: string]: TokenUpdate };
}

export enum TokenUpdate {
	Revoked = "revoked",
	AlreadyRevoked = "already_revoked",
	NotFound = "not_found",
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	interface TokenRow {
		id: string;
		already_revoked: boolean;
	}

	// Sets revokedAt on all tokens that have not already been revoked. Returns
	// whether or not each token was revoked.
	const { rows }: { rows: TokenRow[] } = await ctx.db.execute(Query.sql`
		WITH pre_update AS (
			SELECT
				${Database.tokens.id} AS id,
				${Database.tokens.revokedAt} AS revoked_at
			FROM ${Database.tokens}
			WHERE ${Database.tokens.id} IN ${req.tokenIds}
		)
		UPDATE ${Database.tokens}
		SET revoked_at = COALESCE(${Database.tokens.revokedAt}, current_timestamp)
		FROM pre_update
		WHERE ${Database.tokens.id} = pre_update.id
		RETURNING
			${Database.tokens.id} AS id,
			pre_update.revoked_at IS NOT NULL AS already_revoked
	`);

	const updates: Record<string, TokenUpdate> = {};
	for (const tokenId of req.tokenIds) {
		const tokenRow = rows.find((row) => row.id === tokenId);
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
