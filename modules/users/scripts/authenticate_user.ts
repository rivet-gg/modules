import { RuntimeError } from "../module.gen.ts";
import { ScriptContext } from "../module.gen.ts";

export interface Request {
	userToken: string;
}

export interface Response {
	userId: string;
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

	return { userId };
}
