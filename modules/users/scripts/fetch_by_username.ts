import { Database, Query, ScriptContext } from "../module.gen.ts";
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

	const users = await ctx.db.query.users.findMany({
		where: Query.inArray(Database.users.username, req.usernames),
		orderBy: Query.asc(Database.users.username),
	});

	return { users };
}
