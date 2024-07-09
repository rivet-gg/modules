import { RuntimeError, ScriptContext } from "../module.gen.ts";

export interface Request {
	userToken: string;
	targetUserId: string;
}

export type Response = Record<string, never>;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({ requests: 50 });

	const { userId } = await ctx.modules.users.authenticateToken({
		userToken: req.userToken,
	});

	// Sort the user IDs to ensure consistency
	const userIds = [userId, req.targetUserId].sort();

	const updated = await ctx.db.friend.update({
		where: {
			userIdA_userIdB: { userIdA: userIds[0]!, userIdB: userIds[1]! },
			removedAt: null,
		},
		data: {
			removedAt: new Date(),
		},
		select: { userIdA: true, userIdB: true },
	});
	if (!updated) {
		throw new RuntimeError("FRIEND_NOT_FOUND", {
			meta: { userIdA: userIds[0], userIdB: userIds[1] },
		});
	}

	return {};
}
