import { Database, Query, ScriptContext } from "../module.gen.ts";
import { TokenWithSecret, tokenWithSecretFromRow } from "../utils/types.ts";

export interface Request {
	token: string;
	newExpiration: string | null;
}

export interface Response {
	token: TokenWithSecret;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// Ensure the token hasn't expired or been revoked yet
	const { token } = await ctx.modules.tokens.validate({
		token: req.token,
	});

	// Update the token's expiration date
	const rows = await ctx.db.update(Database.tokens)
		.set({ expireAt: req.newExpiration ? new Date(req.newExpiration) : null })
		.where(Query.eq(Database.tokens.id, token.id))
		.returning();

	// Return the updated token
	return {
		token: tokenWithSecretFromRow(rows[0]!),
	};
}
