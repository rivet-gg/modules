import {
	RuntimeError,
	ScriptContext,
} from "@ogs/helpers/invites/scripts/create.ts";

import { InviteOptions } from "../schema/common.ts";

export interface Request {
	token: string;

	details: Pick<InviteOptions, "from" | "to" | "directional" | "for">;

	module: string;
}

export interface Response {}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rate_limit.throttle({});
	await ctx.modules.invites.clean_expired({});

	const tokenUserId = await (async () => {
		try {
			const { userId: tokenUserId } = await ctx.modules.users.validate_token({
				userToken: req.token,
			});
			return tokenUserId;
		} catch (e) {
			throw new RuntimeError("INVALID_SENDER_TOKEN", { cause: e });
		}
	})();

	if (req.details.from !== tokenUserId) throw new RuntimeError("INVALID_TOKEN");

	const { invites } = await ctx.modules.invites.get({
		token: req.token,
		getType: "AS_SENDER",
		module: req.module,
	});

	const existingInvite = invites.find((invite) => {
		return (
			invite.from === req.details.from &&
			invite.to === req.details.to &&
			invite.for === req.details.for &&
			invite.directional === req.details.directional
		);
	});

	if (!existingInvite) {
		throw new RuntimeError("MATCHING_INVITE_DOESNT_EXIST");
	}

	if (existingInvite.directional) {
		await ctx.db.activeDirectionalInvite.deleteMany({
			where: {
				fromUserId: existingInvite.from,
				toUserId: existingInvite.to,
				for: existingInvite.for,
				originModule: req.module,
			},
		});
	} else {
		await ctx.db.activeNondirectionalInvite.deleteMany({
			where: {
				userAId: [existingInvite.from, existingInvite.to].sort()[0],
				userBId: [existingInvite.from, existingInvite.to].sort()[1],
				for: existingInvite.for,
				originModule: req.module,
			},
		});
	}

	return {};
}
