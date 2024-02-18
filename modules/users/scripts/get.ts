import { ScriptContext } from "@ogs/helpers/users/scripts/get.ts";
import { User } from "../schema/common.ts";

export interface Request {
	userIds: string[];
}

export interface Response {
	users: { [id: string]: User };
}

export async function handler(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// await ctx.call("rate_limit", "throttle", {});

	const rows = await ctx.db.user.findMany({
		where: { id: { in: req.userIds } }
	});

	const users: Record<string, User> = {};
	for (const user of rows) {
		users[user.id] = user;
	}

	return { users };
}
