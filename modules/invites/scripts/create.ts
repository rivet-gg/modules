import {
	RuntimeError,
	ScriptContext,
} from "@ogs/helpers/invites/scripts/create.ts";

import {
	directionalDbInviteToInvite,
	Invite,
	InviteOptions,
	nondirectionalDbInviteToInvite,
} from "../schema/common.ts";

export interface Request {
	request_options: InviteOptions;
	token: string;
}

export interface Response {
	invite: Invite;
}

export async function run(
	ctx: ScriptContext,
	{ request_options, token }: Request,
): Promise<Response> {
	await ctx.modules.rate_limit.throttle({ requests: 50 });
	await ctx.modules.invites.clean_expired({});

	if (request_options.from === request_options.to) {
		throw new RuntimeError("CANNOT_INVITE_SELF");
	}

	const { users } = await ctx.modules.users.get({
		userIds: [request_options.from, request_options.to],
	});
	if (users.every((u) => u.id !== request_options.from)) {
		throw new RuntimeError("SENDER_USER_NOT_FOUND");
	}
	if (users.every((u) => u.id !== request_options.to)) {
		throw new RuntimeError("RECIPIENT_USER_NOT_FOUND");
	}

	const tokenUserId = await (async () => {
		try {
			const { userId: tokenUserId } = await ctx.modules.users.validate_token({
				userToken: token,
			});
			return tokenUserId;
		} catch (e) {
			throw new RuntimeError("INVALID_SENDER_TOKEN", { cause: e });
		}
	})();

	if (request_options.from !== tokenUserId) {
		throw new RuntimeError("INVALID_SENDER_TOKEN");
	}

	const creationTime = new Date();
	const expiration = request_options.expiration;
	const expirationTime = expiration
		? new Date(expiration.ms + creationTime.getTime())
		: undefined;

	if (request_options.onAccept) {
		const acceptScriptValid = ctx.can_call(request_options.module, request_options.onAccept, {
			invite: {
				from: request_options.from,
				to: request_options.to,
				for: request_options.for,
				module: request_options.module,
				directional: request_options.directional,
			},
		});

		if (!acceptScriptValid) {
			throw new RuntimeError("INVALID_ACCEPT_SCRIPT");
		}
	}
	if (request_options.onDecline) {
		const declineScriptValid = ctx.can_call(request_options.module, request_options.onDecline, {
			invite: {
				from: request_options.from,
				to: request_options.to,
				for: request_options.for,
				module: request_options.module,
				directional: request_options.directional,
			},
		});

		if (!declineScriptValid) {
			throw new RuntimeError("INVALID_DECLINE_SCRIPT");
		}
	}

	if (request_options.directional) {
		const dbInvite = await ctx.db.activeDirectionalInvite.create({
			data: {
				createdAt: creationTime,
				fromUserId: request_options.from,
				toUserId: request_options.to,
				for: request_options.for,
				originModule: request_options.module,

				expiration: expirationTime,
				hidePostExpire: request_options.expiration?.hidden_after_expiration,

				onAccept: request_options.onAccept,
				onDecline: request_options.onDecline,
			},
		});

		return { invite: directionalDbInviteToInvite(dbInvite) };
	} else {
		const dbInvite = await ctx.db.activeNondirectionalInvite.create({
			data: {
				userAId: [request_options.from, request_options.to].sort()[0],
				userBId: [request_options.from, request_options.to].sort()[1],
				senderId: request_options.from,

				for: request_options.for,
				originModule: request_options.module,

				expiration: expirationTime,
				hidePostExpire: request_options.expiration?.hidden_after_expiration,
			},
		});

		return { invite: nondirectionalDbInviteToInvite(dbInvite) };
	}
}
