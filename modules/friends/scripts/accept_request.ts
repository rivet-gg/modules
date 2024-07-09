import { RuntimeError, ScriptContext } from "../module.gen.ts";

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

	const { userId } = await ctx.modules.users.authenticateToken({
		userToken: req.userToken,
	});

	await ctx.db.$transaction(async (tx) => {
		// Lock & validate friend request
		interface FriendRequestRow {
			senderUserId: string;
			targetUserId: string;
			acceptedAt: Date | null;
			declinedAt: Date | null;
		}
		const friendRequests = await tx.$queryRawUnsafe<FriendRequestRow[]>(
			`
			SELECT "senderUserId", "targetUserId", "acceptedAt", "declinedAt"
			FROM "${ctx.dbSchema}"."FriendRequest"
			WHERE "id" = $1
			FOR UPDATE
      `,
			req.friendRequestId,
		);
		const friendRequest = friendRequests[0];
		if (!friendRequest) {
			throw new RuntimeError("FRIEND_REQUEST_NOT_FOUND", {
				meta: { friendRequestId: req.friendRequestId },
			});
		}
		if (friendRequest.targetUserId !== userId) {
			throw new RuntimeError("NOT_FRIEND_REQUEST_RECIPIENT", {
				meta: { friendRequestId: req.friendRequestId },
			});
		}
		if (friendRequest.acceptedAt) {
			throw new RuntimeError("FRIEND_REQUEST_ALREADY_ACCEPTED", {
				meta: { friendRequestId: req.friendRequestId },
			});
		}
		if (friendRequest.declinedAt) {
			throw new RuntimeError("FRIEND_REQUEST_ALREADY_DECLINED", {
				meta: { friendRequestId: req.friendRequestId },
			});
		}

		// Sort the user IDs to ensure consistency
		const userIds = [
			friendRequest.senderUserId,
			friendRequest.targetUserId,
		].sort();

		// Accept the friend request & create friend
		await tx.friendRequest.update({
			where: {
				id: req.friendRequestId,
			},
			data: {
				acceptedAt: new Date(),
				friend: {
					create: { userIdA: userIds[0]!, userIdB: userIds[1]! },
				},
			},
		});
	});

	return {};
}
