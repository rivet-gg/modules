import { prisma } from "@ogs/helpers/friends/mod.ts";

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
}

export function friendFromRow(
	row: prisma.Prisma.FriendGetPayload<any>,
): Friend {
	return {
		...row,
		createdAt: row.createdAt.toISOString(),
	};
}
