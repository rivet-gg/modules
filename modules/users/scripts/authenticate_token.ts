import { RuntimeError } from "../module.gen.ts";
import { ScriptContext } from "../module.gen.ts";
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
	await ctx.modules.rateLimit.throttlePublic({});

	const { token } = await ctx.modules.tokens.validate({
		token: req.userToken,
	});
	if (token.type !== "user") throw new RuntimeError("token_not_user_token");
	const userId = token.meta.userId;

	let user;
	if (req.fetchUser) {
		user = await ctx.db.user.findFirstOrThrow({
			where: { id: userId },
		});
	}

	return { userId, user };
}
