import { Context } from "../../../engine/runtime/src/index.ts";
import { User } from "../schema/common.ts";

export interface Request {
    userIds: string[];
}

export interface Response {
    users: User[];
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    const query = await ctx.postgres.run(conn => conn.queryObject<User>`SELECT * FROM users WHERE id = ANY(${req.userIds})`);

    return {
        users: query.rows
    };
}

