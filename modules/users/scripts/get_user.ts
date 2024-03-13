import { ScriptContext } from "../_gen/scripts/get_user.ts";
import { User } from "../utils/types.ts";

export interface Request {
	userIds: string[];
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
		where: { id: { in: req.userIds } },
		orderBy: { username: "desc" },
	});

	return { users };
}
