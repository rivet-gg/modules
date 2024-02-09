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
        SELECT id, type, meta, to_json(created_at) AS created_at, to_json(expire_at) AS expire_at, to_json(revoked_at) AS revoked_at
        FROM tokens
        WHERE token = ANY(${req.tokens})
    `);

    let tokens: Record<string, Token> = {};
    for (let token of query.rows) {
        tokens[token.token] = token;
    }

    return { tokens };
}

