import { RuntimeError, ScriptContext, Database, Query } from "../module.gen.ts";
import { } from "../module.gen.ts";
import { User } from "../utils/types.ts";

export interface Request {
	userToken: string;
	fetchUser?: boolean;
}

export interface Response {
	userId: string;
	user?: User;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {

	const { token } = await ctx.modules.tokens.validate({
		token: req.userToken,
	});
	if (token.type !== "user") throw new RuntimeError("token_not_user_token");
	const userId = token.meta.userId;

	let user: typeof Database.users.$inferSelect | undefined = undefined;
	if (req.fetchUser) {
    user = await ctx.db.query.users.findFirst({
      where: Query.eq(Database.users.id, userId)
    });
	}

	return { userId, user };
}
