import {
	RuntimeError,
	ScriptContext,
} from "@ogs/helpers/friends/scripts/send_request.ts";
import { FriendRequest } from "../types/common.ts";

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
	}) as any;

	if (userId === req.targetUserId) {
		throw new Error("You cannot send a friend request to yourself");
	}

	try {
		const { invite } = await ctx.modules.invites.create({
			request_options: {
				from: userId,
				to: req.targetUserId,
				directional: false,
				for: "friend",
				module: "friends",
			},
			token: req.userToken,
		});

		return {
			friendRequest: {
				id: `${invite.from}::${invite.to}`,
				senderUserId: invite.from,
				targetUserId: invite.to,
				createdAt: invite.created,
			},
		};
	} catch (e) {
		if (e instanceof RuntimeError && e.code === "INVITE_ALREADY_EXISTS") {
			throw new RuntimeError("FRIEND_REQUEST_ALREADY_EXISTS", {
				meta: { userId, targetUserId: req.targetUserId },
			});
		}
		throw e;
	}
}
