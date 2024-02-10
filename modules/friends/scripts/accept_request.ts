import { ScriptContext } from "@ogs/runtime";

export interface Request {
	userToken: string;
	friendRequestId: string;
}

export interface Response {
}

export async function handler(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", { requests: 50 });
	const { userId } = await ctx.call("users", "validate_token", {
		userToken: req.userToken,
	}) as any;

	await ctx.postgres.transaction("accept_request", async (tx) => {
		const selectQuery = await tx.queryObject<
			{
				sender_user_id: string;
				target_user_id: string;
				accepted_at: string;
				declined_at: string;
			}
		>`
            SELECT sender_user_id, target_user_id, to_json(accepted_at) AS accepted_at, to_json(declined_at) AS declined_at
            FROM friend_requests
            WHERE id = ${req.friendRequestId}
            FOR UPDATE
        `;
		const friendRequest = selectQuery.rows[0];
		if (!friendRequest) throw new Error("Friend request not found");
		if (friendRequest.target_user_id !== userId) {
			throw new Error("You are not the receiver of this friend request");
		}
		if (friendRequest.accepted_at) {
			throw new Error("Friend request already accepted");
		}
		if (friendRequest.declined_at) {
			throw new Error("Friend request already declined");
		}

		await tx.queryObject`
            UPDATE friend_requests
            SET accepted_at = timezone('utc', now())
            WHERE id = ${req.friendRequestId}
        `;

		const [userIdA, userIdB] = [
			friendRequest.sender_user_id,
			friendRequest.target_user_id,
		].sort();
		await tx
			.queryObject`INSERT INTO friends (user_id_a, user_id_b) VALUES (${userIdA}, ${userIdB})`;
	});

	return {};
}
