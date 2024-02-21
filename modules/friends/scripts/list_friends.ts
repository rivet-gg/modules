import { ScriptContext } from "@ogs/helpers/friends/scripts/list_friends.ts";
import { Friend, friendFromRow } from "../types/common.ts";

export interface Request {
	userToken: string;
}

export interface Response {
	friends: Friend[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", {});
	const { userId } = await ctx.call("users", "validate_token", {
		userToken: req.userToken,
	});

	const rows = await ctx.db.friend.findMany({
		where: {
			AND: [
				{
					OR: [
						{ userIdA: userId },
						{ userIdB: userId },
					],
				},
				{ removedAt: null },
			],
		},
		orderBy: {
			createdAt: "desc",
		},
		take: 100,
	});

	const friends = rows.map(friendFromRow);

	return { friends };
}
