import { ScriptContext } from "../_gen/scripts/list_friends.ts";
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
	await ctx.modules.rateLimit.throttlePublic({ requests: 50 });

	const { userId } = await ctx.modules.users.validateUserToken({
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
