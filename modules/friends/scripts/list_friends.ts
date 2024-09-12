import { ScriptContext, Database, Query } from "../module.gen.ts";
import { Friend, friendFromRow } from "../utils/types.ts";

export interface Request {
	userToken: string;
}

export interface Response {
	friends: Friend[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({ requests: 50 });

	const { userId } = await ctx.modules.users.authenticateTokenInternal({
		userToken: req.userToken,
	});

	const rows = await ctx.db.query.friends.findMany({
    where: Query.and(
      // Find all friends for this user
      Query.or(
        Query.eq(Database.friends.userIdA, userId),
        Query.eq(Database.friends.userIdB, userId),
      ),
      // Ensure not deleted
      Query.isNull(Database.friends.removedAt)
    ),
    orderBy: Query.desc(Database.friends.createdAt),
    limit: 100,
	});

	const friends = rows.map(friendFromRow);

	return { friends };
}
