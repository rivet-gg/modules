import { ScriptContext } from "@ogs/helpers/users/get.ts";
import { User } from "../types/common.ts";

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

	const rows = await ctx.db.query.users.findMany({
		where: (users, { inArray }) => inArray(users.id, req.userIds),
	});

	const users: Record<string, User> = {};
	for (const user of rows) {
		users[user.id] = user;
	}

	return { users };
}
