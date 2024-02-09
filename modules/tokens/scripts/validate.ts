import { Context } from "@ogs/runtime";
import { Token } from "../schema/common.ts";

export interface Request {
    tokens: string[];
}

export interface Response {
    tokens: { [key: string]: Token };
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    let query = await ctx.postgres.run(conn => conn.queryObject<Token & { token: string }>`
        SELECT id, type, meta, created_at, expire_at, revoked_at
        FROM tokens
        WHERE token = ANY(${req.tokens})
    `);

    let tokens: Record<string, Token> = {};
    for (let token of query.rows) {
        tokens[token.token] = token;
    }

    return { tokens };
}

