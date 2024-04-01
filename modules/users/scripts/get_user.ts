import { ScriptContext } from "../module.gen.ts";
import { User } from "../utils/types.ts";
import { withPfpUrls } from "../utils/pfp.ts";

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


	const usersWithPfps = await withPfpUrls(ctx, users);

	return { users: usersWithPfps };
}
