import { prisma } from "./_gen/mod.ts";

export interface Friend {
	userIdA: string;
	userIdB: string;
	createdAt: string;
}

export interface FriendRequest {
	id: string;
	senderUserId: string;
	targetUserId: string;
	createdAt: string;
	declinedAt: string | null;
	acceptedAt: string | null;
}

export function friendFromRow(
	row: prisma.Prisma.FriendGetPayload<any>,
): Friend {
	return {
		...row,
		createdAt: row.createdAt.toISOString(),
	};
}

export function friendRequestFromRow(
	row: prisma.Prisma.FriendRequestGetPayload<any>,
): FriendRequest {
	return {
		...row,
		createdAt: row.createdAt.toISOString(),
		declinedAt: row.declinedAt?.toISOString() ?? null,
		acceptedAt: row.acceptedAt?.toISOString() ?? null,
	};
}
