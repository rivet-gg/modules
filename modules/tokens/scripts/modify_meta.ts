import { ScriptContext } from "../module.gen.ts";
import { Token, tokenFromRow } from "../utils/types.ts";

export interface Request {
	token: string;
	newMeta: { [key: string]: any };
}

export interface Response {
	token: Token;
	oldMeta: { [key: string]: any };
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
	const newToken = await ctx.db.token.update({
		where: {
			id: token.id,
		},
		data: {
			meta: req.newMeta,
		},
	});

	// Return the updated token
	return {
		token: tokenFromRow(newToken),
		oldMeta: token.meta,
	};
}
