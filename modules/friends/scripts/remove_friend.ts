import {
	RuntimeError,
	ScriptContext,
} from "@ogs/helpers/friends/scripts/remove_friend.ts";

export interface Request {
	userToken: string;
	targetUserId: string;
}

export interface Response {
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", { requests: 50 });
	const { userId } = await ctx.call("users", "validate_token", {
		userToken: req.userToken,
	});

	// Sort the user IDs to ensure consistency
	const [userIdA, userIdB] = [userId, req.targetUserId].sort();

	const updated = await ctx.db.friend.update({
		where: {
			userIdA_userIdB: { userIdA, userIdB },
			removedAt: null,
		},
		data: {
			removedAt: new Date(),
		},
		select: { userIdA: true, userIdB: true },
	});
	if (!updated) {
		throw new RuntimeError("FRIEND_NOT_FOUND", { meta: { userIdA, userIdB } });
	}

	return {};
}
