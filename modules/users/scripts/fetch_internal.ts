import { ScriptContext, Query, Database } from "../module.gen.ts";
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

  const users = await ctx.db.query.users.findMany({
    where: Query.inArray(Database.users.id, req.userIds),
    orderBy: Query.desc(Database.users.username),
  });

	return { users };
}
