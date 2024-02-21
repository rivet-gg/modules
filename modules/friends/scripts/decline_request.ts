import {
	RuntimeError,
	ScriptContext,
} from "@ogs/helpers/friends/scripts/decline_request.ts";

export interface Request {
	userToken: string;
	friendRequestId: string;
}

export interface Response {
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", { requests: 50 });
	const { userId } = await ctx.call("users", "validate_token", {
		userToken: req.userToken,
	});
	const senderId = req.friendRequestId.replace("::", "").replace(userId, "");

	await ctx.modules.invites.decline({
		details: {
			from: senderId,
			to: userId,
			directional: false,
			for: "friend",
		},
		token: req.userToken,
		module: "friends",
	});

	return {};
}
