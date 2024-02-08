import { Context } from "../../../engine/runtime/src/index.ts";
import { Token } from "../schema/common.ts";

export interface Request {
    tokenIds: string[];
}

export interface Response {
    tokens: Token[];
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    let query = await ctx.postgres.run(conn => conn.queryObject`SELECT * FROM tokens WHERE id = ANY(${req.tokenIds})`);

    let tokens = {};
    for (let token of query.rows) {
        tokens[token.id] = token;
    }

    return { tokens };
}
