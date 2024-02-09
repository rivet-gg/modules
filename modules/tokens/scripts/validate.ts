import { Context } from "../../../engine/runtime/src/index.ts";
import { Token } from "../schema/common.ts";

export interface Request {
    tokens: string[];
}

export interface Response {
    tokens: Record<string, Token>;
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    let query = await ctx.postgres.run(conn => conn.queryObject<Token & { token: string }>`
        SELECT id, type, meta, trace, created_at, expire_at, revoked_at
        FROM tokens
        WHERE token = ANY(${req.tokens})
    `);

    let tokens: Record<string, Token> = {};
    for (let token of query.rows) {
        tokens[token.token] = token;
    }

    return { tokens };
}

