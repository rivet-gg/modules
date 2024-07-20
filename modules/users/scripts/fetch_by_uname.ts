import { ScriptContext } from "../module.gen.ts";
import { User } from "../utils/types.ts";

export interface Request {
	usernames: string[];
}

export interface Response {
	users: User[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

	const users = await ctx.db.user.findMany({
		where: { username: { in: req.usernames } },
		orderBy: { username: "desc" },
	});

	return { users };
}
