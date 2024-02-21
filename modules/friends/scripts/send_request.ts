import {
	RuntimeError,
	ScriptContext,
} from "@ogs/helpers/friends/scripts/send_request.ts";
import { FriendRequest, friendRequestFromRow } from "../types/common.ts";

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
	await ctx.call("rate_limit", "throttle", {});

	const { userId } = await ctx.call("users", "validate_token", {
		userToken: req.userToken,
	});

	if (userId === req.targetUserId) {
		throw new Error("You cannot send a friend request to yourself");
	}

	// Sort the user IDs to ensure consistency
	const [userIdA, userIdB] = [userId, req.targetUserId].sort();

	const row = await ctx.db.$transaction(async (tx) => {
		// Validate that the users are not already friends
		const existingFriendRows = await tx.$queryRaw<any[]>`
			SELECT 1
			FROM "Friend"
			WHERE "userIdA" = ${userIdA} OR "userIdB" = ${userIdA}
			FOR UPDATE
		`;
		if (existingFriendRows.length > 0) {
			throw new RuntimeError("ALREADY_FRIENDS", { meta: { userIdA, userIdB } });
		}

		// Validate that the users do not already have a pending friend request
		const existingRequest = await tx.friendRequest.findFirst({
			where: {
				senderUserId: userId,
				targetUserId: req.targetUserId,
				acceptedAt: null,
				declinedAt: null,
			},
			select: { senderUserId: true, targetUserId: true },
		});
		if (existingRequest) {
			throw new RuntimeError("FRIEND_REQUEST_ALREADY_EXISTS", {
				meta: { userId, targetUserId: req.targetUserId },
			});
		}

		// Create friend request
		const friendRequest = await tx.friendRequest.create({
			data: {
				senderUserId: userId,
				targetUserId: req.targetUserId,
			},
		});

		return friendRequest;
	});

	return {
		friendRequest: friendRequestFromRow(row),
	};
}
