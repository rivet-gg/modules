import { ScriptContext } from "@ogs/runtime";
import { FriendRequest } from "../schema/common.ts";

export interface Request {
	userToken: string;
}

export interface Response {
	friendRequests: FriendRequest[];
}

export async function handler(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", {});
	const { userId } = await ctx.call("users", "validate_token", {
		userToken: req.userToken,
	}) as any;

	const query = await ctx.postgres.run((conn) =>
		conn.queryObject<FriendRequest>`
        SELECT id, sender_user_id, target_user_id, to_json(created_at) AS created_at, to_json(declined_at) AS declined_at, to_json(accepted_at) AS accepted_at
        FROM friend_requests
        WHERE sender_user_id = ${userId} AND accepted_at IS NULL AND declined_at IS NULL
        ORDER BY friend_requests.created_at DESC
        LIMIT 100
    `
	);

	return { friendRequests: query.rows };
}
