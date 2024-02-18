import { ScriptContext } from "@ogs/helpers/users/scripts/get.ts";
import { User } from "../types/common.ts";

export interface Request {
	userIds: string[];
}

export interface Response {
	users: User[];
}

export async function handler(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", {});

	const users = await ctx.db.user.findMany({
		where: { id: { in: req.userIds } },
		orderBy: { username: "desc" },
	});

	return { users };
}
