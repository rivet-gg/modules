import { Context } from "@ogs/runtime";
import { Token } from "../schema/common.ts";

export interface Request {
    tokenIds: string[];
}

export interface Response {
    tokens: { [key: string]: Token },
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    const query = await ctx.postgres.run(conn => conn.queryObject<Token>`
        SELECT id, type, meta, created_at, expire_at, revoked_at
        FROM tokens
        WHERE id = ANY(${req.tokenIds})
    `);

    const tokens: Record<string, Token> = {};
    for (const token of query.rows) {
        tokens[token.id] = token;
    }

    return { tokens };
}
