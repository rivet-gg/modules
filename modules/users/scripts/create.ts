import { Context } from "../../../engine/runtime/src/index.ts";
import { User } from "../schema/common.ts";

export interface Request {
    username: string;
}

export interface Response {
    user: User;
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    let query = await ctx.postgres.run(conn => conn.queryObject`INSERT INTO users (username) VALUES (${req.username}) RETURNING *`)

    return {
        user: query.rows[0]
    };
}

