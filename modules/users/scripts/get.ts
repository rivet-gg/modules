import { Context } from "../../../engine/runtime/src/index.ts";
import { User } from "../schema/common.ts";

export interface Request {
    userIds: string[];
}

export interface Response {
    users: User[];
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    let users = await ctx.postgres.run(async conn => conn.queryObject`SELECT * FROM users`);

    return {
        users: query.rows
    };
}

