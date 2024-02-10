import { ScriptContext } from "@ogs/runtime";
import { FriendRequest } from "../schema/common.ts";

export interface Request {
	userToken: string;
	targetUserId: string;
}

export interface Response {
	friendRequest: FriendRequest;
}

export async function handler(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", {});
	const { userId } = await ctx.call("users", "validate_token", {
		userToken: req.userToken,
	}) as any;

	if (userId === req.targetUserId) {
		throw new Error("You cannot send a friend request to yourself");
	}

	const [userIdA, userIdB] = [userId, req.targetUserId].sort();

	const friendRequest = await ctx.postgres.transaction(
		"send_request",
		async (tx) => {
			const friendQuery = await tx.queryObject<{ exists: boolean }>`
            SELECT EXISTS(
                SELECT 1
                FROM friends
                WHERE user_id_a = ${userIdA} AND user_id_b = ${userIdB} AND removed_at IS NULL
                FOR UPDATE
            )
        `;
			if (friendQuery.rows[0].exists) {
				throw new Error(
					"Target user already has a friend request to you",
				);
			}

			const existsQuery = await tx.queryObject<{ exists: boolean }>`
            SELECT EXISTS(
                SELECT 1
                FROM friend_requests
                WHERE sender_user_id = ${userId} AND target_user_id = ${req.targetUserId} AND accepted_at IS NULL AND declined_at IS NULL
                FOR UPDATE
            )
        `;
			if (existsQuery.rows[0].exists) {
				throw new Error(
					"Friend request already sent",
				);
			}

			const insertQuery = await tx.queryObject<FriendRequest>`
            INSERT INTO friend_requests (sender_user_id, target_user_id)
            VALUES (${userId}, ${req.targetUserId})
            RETURNING id, sender_user_id, target_user_id, to_json(created_at) AS created_at, to_json(declined_at) AS declined_at, to_json(accepted_at) AS accepted_at
        `;
			return insertQuery.rows[0];
		},
	);

	return { friendRequest };
}
