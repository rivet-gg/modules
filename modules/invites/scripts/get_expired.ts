import {
	RuntimeError,
	ScriptContext,
} from "@ogs/helpers/invites/scripts/get.ts";

import { expiredDbInviteToInvite, GetType, Invite } from "../schema/common.ts";

export interface Request {
	token: string;
	getType: GetType;
	module: string;
}

export interface Response {
	invites: Invite[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rate_limit.throttle({});
	await ctx.modules.invites.clean_expired({});

	const { userId: tokenUserId } = await (async () => {
		try {
			return await ctx.modules.users.validate_token({
				userToken: req.token,
			});
		} catch (e) {
			throw new RuntimeError("INVALID_TOKEN", { cause: e });
		}
	})();

	const asSender = req.getType === "ALL" || req.getType === "AS_SENDER";
	const asRecipient = req.getType === "ALL" || req.getType === "AS_RECIPIENT";

	const senderInvites = asSender
		? await ctx.db.expiredInvite.findMany({
			where: {
				fromUserId: tokenUserId,
				originModule: req.module,
			},
		})
		: [];

	const recipientInvites = asRecipient
		? await ctx.db.expiredInvite.findMany({
			where: {
				toUserId: tokenUserId,
				originModule: req.module,
			},
		})
		: [];

	const invites = [
		...senderInvites.map(expiredDbInviteToInvite),
		...recipientInvites.map(expiredDbInviteToInvite),
	];

	return { invites };
}
