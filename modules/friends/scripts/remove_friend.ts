import { RuntimeError, ScriptContext } from "../_gen/scripts/remove_friend.ts";

export interface Request {
	userToken: string;
	targetUserId: string;
}

export type Response = Record<string, never>;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttle({ requests: 50 });

	const { userId } = await ctx.modules.users.validateToken({ userToken: req.userToken });

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
