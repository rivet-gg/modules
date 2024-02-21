import {
	RuntimeError,
	ScriptContext,
} from "@ogs/helpers/invites/scripts/get.ts";


import {
	Invite, GetType,
	directionalDbInviteToInvite, nondirectionalDbInviteToInvite,
} from "../schema/common.ts";

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

	const { userId: tokenUserId } = await (async () => {
		try {
			return await ctx.modules.users.validate_token({
				userToken: req.token,
			});
		} catch (e) {
			throw new RuntimeError("INVALID_TOKEN", { cause: e });
		}
	})();

	const asSender = req.getType === 'ALL' || req.getType === 'AS_SENDER';
	const asRecipient = req.getType === 'ALL' || req.getType === 'AS_RECIPIENT';

	const senderInvitesDir = asSender ? await ctx.db.activeDirectionalInvite.findMany({
		where: {
			fromUserId: tokenUserId,
			originModule: req.module,
		},
	}) : [];
	const senderInvitesNondir = asSender ? await ctx.db.activeNondirectionalInvite.findMany({
		where: {
			senderId: tokenUserId,
			originModule: req.module,
		},
	}) : [];

	const recipientInvitesDir = asRecipient ? await ctx.db.activeDirectionalInvite.findMany({
		where: {
			toUserId: tokenUserId,
			originModule: req.module,
		},
	}) : [];
	const recipientInvitesNondir = asRecipient ? await ctx.db.activeNondirectionalInvite.findMany({
		where: {
			OR: [
				{ userAId: tokenUserId },
				{ userBId: tokenUserId },
			],
			NOT: { senderId: tokenUserId },
			originModule: req.module,
		},
	}) : [];
	

	const invites = [
		...senderInvitesDir.map(directionalDbInviteToInvite),
		...senderInvitesNondir.map(nondirectionalDbInviteToInvite),
		...recipientInvitesDir.map(directionalDbInviteToInvite),
		...recipientInvitesNondir.map(nondirectionalDbInviteToInvite),
	];

	return { invites };
}
