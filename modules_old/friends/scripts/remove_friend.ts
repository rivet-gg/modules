import { ScriptContext } from "@ogs/helpers/friends/remove_friend.ts";

export interface Request {
	userToken: string;
	targetUserId: string;
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

	const [userIdA, userIdB] = [userId, req.targetUserId].sort();

	const updateQuery = await ctx.postgres.run((conn) =>
		conn.queryObject`
        UPDATE friends
        SET removed_at = timezone('utc', now())
        WHERE user_id_a = ${userIdA} AND user_id_b = ${userIdB} AND removed_at IS NULL
        RETURNING 1
    `
	);
	if (updateQuery.rowCount === 0) {
		throw new Error("Friend does not exist");
	}

	return {};
}
