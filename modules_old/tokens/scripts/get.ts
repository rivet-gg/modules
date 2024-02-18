import { ScriptContext } from "@ogs/helpers/tokens/get.ts";
import { Token } from "../types/common.ts";

export interface Request {
	tokenIds: string[];
}

export interface Response {
	tokens: { [key: string]: Token };
}

export async function handler(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const query = await ctx.postgres.run((conn) =>
		conn.queryObject<Token>`
        SELECT id, type, meta, to_json(created_at) AS created_at, to_json(expire_at) AS expire_at, to_json(revoked_at) AS revoked_at
        FROM tokens
        WHERE id = ANY(${req.tokenIds})
    `
	);

	const tokens: Record<string, Token> = {};
	for (const token of query.rows) {
		tokens[token.id] = token;
	}

	return { tokens };
}
