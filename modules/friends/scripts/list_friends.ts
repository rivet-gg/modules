import { Context } from "@ogs/runtime";
import { Friend } from "../schema/common.ts";

export interface Request {
    userToken: string;
}

export interface Response {
    friends: Friend[];
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    await ctx.call("rate_limit", "throttle", {});
    const { userId } = await ctx.call("users", "validate_token", { userToken: req.userToken }) as any;

    const query = await ctx.postgres.run(conn => conn.queryObject<Friend>`
        SELECT
            (CASE WHEN user_id_a = ${userId} THEN user_id_b ELSE user_id_a END) AS user_id,
            to_json(created_at) AS created_at
        FROM friends
        WHERE user_id_a = ${userId} OR user_id_b = ${userId} AND removed_at IS NULL
        ORDER BY friends.created_at DESC
        LIMIT 100
    `);
    
    return { friends: query.rows };
}
