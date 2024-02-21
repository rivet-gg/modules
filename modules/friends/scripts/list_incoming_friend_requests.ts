import { ScriptContext } from "@ogs/helpers/friends/scripts/list_incoming_friend_requests.ts";
import { FriendRequest, friendRequestFromRow } from "../types/common.ts";

export interface Request {
	userToken: string;
}

export interface Response {
	friendRequests: FriendRequest[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", {});
	const { userId } = await ctx.call("users", "validate_token", {
		userToken: req.userToken,
	});

	const rows = await ctx.db.friendRequest.findMany({
		where: {
			targetUserId: userId,
			acceptedAt: null,
			declinedAt: null,
		},
		orderBy: {
			createdAt: "desc",
		},
		take: 100,
	});

	const friendRequests = rows.map(friendRequestFromRow);

	return { friendRequests };
}
