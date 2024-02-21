import { ScriptContext } from "@ogs/helpers/friends/scripts/list_incoming_friend_requests.ts";
import { FriendRequest } from "../types/common.ts";

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
	await ctx.call("users", "validate_token", { userToken: req.userToken });

	const { invites } = await ctx.modules.invites.get({
		token: req.userToken,
		getType: "AS_RECIPIENT",
		module: "friends",
	});

	return {
		friendRequests: invites.map((invite) => ({
			id: `${invite.from}::${invite.to}`,
			senderUserId: invite.from,
			targetUserId: invite.to,
			createdAt: invite.created,
		})),
	};
}
