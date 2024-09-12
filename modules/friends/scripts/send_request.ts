import { RuntimeError, ScriptContext, Database, Query } from "../module.gen.ts";
import { FriendRequest, friendRequestFromRow } from "../utils/types.ts";

export interface Request {
	userToken: string;
	targetUserId: string;
}

export interface Response {
	friendRequest: FriendRequest;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

	const { userId } = await ctx.modules.users.authenticateTokenInternal({
		userToken: req.userToken,
	});

	if (userId === req.targetUserId) {
		throw new RuntimeError("cannot_send_to_self");
	}

	// Sort the user IDs to ensure consistency
	const [userIdA, userIdB] = [userId, req.targetUserId].sort();

	const row = await ctx.db.transaction(async tx => {
		// Validate that the users are not already friends
		// TODO: Remove this `any` and replace with a proper type
		const { rows: existingFriendRows } = await tx.execute(
			Query.sql`
			SELECT 1
			FROM ${Database.friends}
			WHERE ${Database.friends.userIdA} = ${userIdA} OR ${Database.friends.userIdB} = ${userIdB}
			FOR UPDATE
      `
		);
		if (existingFriendRows.length > 0) {
			throw new RuntimeError("already_friends", { meta: { userIdA, userIdB } });
		}

		// Validate that the users do not already have a pending friend request
		const existingRequest = await tx.query.friendRequests.findFirst({
      where: Query.and(
        Query.eq(Database.friendRequests.senderUserId, userId),
        Query.eq(Database.friendRequests.targetUserId, req.targetUserId),
        Query.isNull(Database.friendRequests.acceptedAt),
        Query.isNull(Database.friendRequests.declinedAt),
      )
		});
		if (existingRequest) {
			throw new RuntimeError("friend_request_already_exists", {
				meta: { userId, targetUserId: req.targetUserId },
			});
		}

		// Create friend request
    const friendRequests = await tx.insert(Database.friendRequests)
      .values({
        senderUserId: userId,
        targetUserId: req.targetUserId,
      })
      .returning();

		return friendRequests[0]!;
	});

	return {
		friendRequest: friendRequestFromRow(row),
	};
}
