export interface InviteOptions {
	from: string;
	to: string;
	for: string;

	directional: boolean;

	expiration?: {
		ms: number;
		hidden_after_expiration: boolean;
	};

	module: string;
}

export interface Invite extends InviteOptions {
	created: string;
	expires: string | null;
}

export type GetType = 'ALL' | 'AS_SENDER' | 'AS_RECIPIENT';


import { prisma } from "@ogs/helpers/invites/test.ts";

export function directionalDbInviteToInvite(dbInvite: prisma.ActiveDirectionalInvite): Invite {
	const dbExpiration = dbInvite.expiration;
	const dbHidePostExpire = dbInvite.hidePostExpire;

	return {
		from: dbInvite.fromUserId,
		to: dbInvite.toUserId,

		for: dbInvite.for,
		directional: true,

		module: dbInvite.originModule,
		
		created: dbInvite.createdAt.toJSON(),
		expiration: (dbExpiration && dbHidePostExpire) ? {
			ms: dbExpiration.getTime() - dbInvite.createdAt.getTime(),
			hidden_after_expiration: dbHidePostExpire,
		} : undefined,
		expires: dbExpiration?.toJSON() ?? null,
	};
}

export function nondirectionalDbInviteToInvite(dbInvite: prisma.ActiveNondirectionalInvite): Invite {
	const dbExpiration = dbInvite.expiration;
	const dbHidePostExpire = dbInvite.hidePostExpire;

	return {
		from: dbInvite.senderId,
		to: dbInvite.userAId === dbInvite.senderId ? dbInvite.userBId : dbInvite.userAId,

		for: dbInvite.for,
		directional: false,

		module: dbInvite.originModule,
		
		created: dbInvite.createdAt.toJSON(),
		expiration: (dbExpiration && dbHidePostExpire) ? {
			ms: dbExpiration.getTime() - dbInvite.createdAt.getTime(),
			hidden_after_expiration: dbHidePostExpire,
		} : undefined,
		expires: dbExpiration?.toJSON() ?? null,
	};
}
