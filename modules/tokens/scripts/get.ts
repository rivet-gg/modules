import { Context } from "../../../engine/runtime/src/index.ts";
import { Token } from "../schema/common.ts";

export interface Request {
    tokenIds: string[];
}

export interface Response {
    tokens: Record<string, Token>,
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    const query = await ctx.postgres.run(conn => conn.queryObject<Token>`
        SELECT id, type, meta, trace, created_at, expire_at, revoked_at
        FROM tokens
        WHERE id = ANY(${req.tokenIds})
    `);

    const tokens: Record<string, Token> = {};
    for (const token of query.rows) {
        tokens[token.id] = token;
    }

    return { tokens };
}
