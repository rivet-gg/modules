import {
	RuntimeError,
	ScriptContext,
} from "@ogs/helpers/parties/scripts/create.ts";
import { Party } from "../schema/common.ts";

import { Response as ListFriendsResponse } from "../../friends/scripts/list_friends.ts";
import { Response as GetUserResponse } from "../../users/scripts/get.ts";
import { Response as ValidateTokenResponse } from "../../users/scripts/validate_token.ts";

export interface Request {
	ownerToken: string;
	friendsOnly: boolean;
	otherMembers?: string[];
}

export interface Response {
	party: Party;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", { requests: 50 });

	const { userId: ownerId } = await ctx.call("users", "validate_token", {
		userToken: req.ownerToken,
	}) as ValidateTokenResponse;
	if (!ownerId) throw new Error("OWNER_NOT_FOUND");

	const allMemberList = [ownerId, ...(req.otherMembers ?? [])];
	const { users: memberMap } = await ctx.call("users", "get", {
		userIds: allMemberList,
	}) as GetUserResponse;

	const owner = memberMap.find((member) => member.id === ownerId);
	const members = req.otherMembers?.flatMap((id) => {
		const member = memberMap.find((member) => member.id === id);
		return member ? [member] : [];
	}) ?? [];

	if (!owner) throw new Error("OWNER_NOT_FOUND");
	if (members.some((member) => !member)) throw new Error("MEMBER_NOT_FOUND");

	if (req.friendsOnly && req.otherMembers) {
		const { friends: ownerFriendList } = await ctx.call(
			"friends",
			"list_friends",
			{ userToken: req.ownerToken },
		) as ListFriendsResponse;

		const ownerFriends: Set<string> = new Set(
			ownerFriendList.map((f) => f.userIdA === ownerId ? f.userIdB : f.userIdA),
		);

		
		for (const member of members) {
			if (!ownerFriends.has(member.id)) {
				throw new Error(JSON.stringify(ownerFriendList, null, 2));
				throw new RuntimeError("FRIEND_CONSTRAINT_FAILED");
			}
		}
	}

	const party = await ctx.db.party.create({
		data: {
			name: "New party",
			ownerId,
			friendsOnly: req.friendsOnly,
			members: {
				create: memberMap.map(({ id }) => ({
					user: { create: { id } },
				})),
			},
		},
		include: { members: true },
	});

	return {
		party: {
			id: party.id,
			name: party.name,

			owner_id: party.ownerId,
			member_ids: party.members.map((m) => m.userId),

			friends_only: party.friendsOnly,

			created_at: party.createdAt.toJSON(),
		},
	};
}
