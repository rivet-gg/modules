import { Context } from "@ogs/runtime";
import { Token, TokenWithSecret } from "../schema/common.ts";

export interface Request {
	tokens: string[];
}

export interface Response {
	tokens: { [key: string]: Token };
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
	const query = await ctx.postgres.run((conn) =>
		conn.queryObject<TokenWithSecret>`
        SELECT token, id, type, meta, to_json(created_at) AS created_at, to_json(expire_at) AS expire_at, to_json(revoked_at) AS revoked_at
        FROM tokens
        WHERE token = ANY(${req.tokens})
    `
	);

	const tokens: Record<string, Token> = {};
	for (const token of query.rows) {
		tokens[token.token] = {
			id: token.id,
			type: token.type,
			meta: token.meta,
			created_at: token.created_at,
			expire_at: token.expire_at,
			revoked_at: token.revoked_at,
		};
	}

	return { tokens };
}
