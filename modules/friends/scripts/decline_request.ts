import { RuntimeError, ScriptContext, Database, Query } from "../module.gen.ts";

export interface Request {
	userToken: string;
	friendRequestId: string;
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

	await ctx.db.transaction(async tx => {
		// Lock & validate friend request
		interface FriendRequestRow {
			sender_user_id: string;
			target_user_id: string;
			accepted_at: Date | null;
			declined_at: Date | null;
		}

		const { rows: friendRequests }: { rows: FriendRequestRow[] } = await tx.execute(
			Query.sql`
      SELECT ${Database.friendRequests.senderUserId}, ${Database.friendRequests.targetUserId}, ${Database.friendRequests.acceptedAt}, ${Database.friendRequests.declinedAt}
      FROM ${Database.friendRequests}
      WHERE ${Database.friendRequests.id} = ${req.friendRequestId}
      FOR UPDATE
      `
		);
		const friendRequest = friendRequests[0];
		if (!friendRequest) {
			throw new RuntimeError("friend_request_not_found", {
				meta: { friendRequestId: req.friendRequestId },
			});
		}
		if (friendRequest.target_user_id !== userId) {
			throw new RuntimeError("not_friend_request_recipient", {
				meta: { friendRequestId: req.friendRequestId },
			});
		}
		if (friendRequest.accepted_at) {
			throw new RuntimeError("friend_request_already_accepted", {
				meta: { friendRequestId: req.friendRequestId },
			});
		}
		if (friendRequest.declined_at) {
			throw new RuntimeError("friend_request_already_declined", {
				meta: { friendRequestId: req.friendRequestId },
			});
		}

		// Decline the friend request
    await tx.update(Database.friendRequests)
      .set({ declinedAt: new Date() })
      .where(Query.eq(Database.friendRequests.id, req.friendRequestId))
      .execute();
	});

	return {};
}
