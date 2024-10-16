import { RuntimeError, ScriptContext, Database, Query } from "../module.gen.ts";

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

	const { userId } = await ctx.modules.users.authenticateTokenInternal({
		userToken: req.userToken,
	});

	// Sort the user IDs to ensure consistency
	const userIds = [userId, req.targetUserId].sort();

  const updated = await ctx.db.update(Database.friends)
    .set({ removedAt: new Date() })
    .where(Query.and(
      Query.eq(Database.friends.userIdA, userIds[0]!),
      Query.eq(Database.friends.userIdB, userIds[1]!),
      Query.isNull(Database.friends.removedAt)
    ))
    .returning();
	if (updated.length == 0) {
		throw new RuntimeError("friend_not_found", {
			meta: { userIdA: userIds[0], userIdB: userIds[1] },
		});
	}

	return {};
}
