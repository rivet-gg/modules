import { Context } from "../../../engine/runtime/src/index.ts";
import { Token } from "../schema/common.ts";

export interface Request {
    tokens: string[];
}

export interface Response {
    tokens: { [token: string]: Token[] };
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    let query = await ctx.postgres.run(conn => conn.queryObject`SELECT * FROM tokens WHERE tokens = ANY(${req.tokens})`);

    let tokens = {};
    for (let token of query.rows) {
        tokens[token.token] = token;
    }

    return { tokens };
}

