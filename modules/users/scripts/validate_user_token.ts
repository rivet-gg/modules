import { RuntimeError } from "../_gen/mod.ts";
import { ScriptContext } from "../_gen/scripts/validate_user_token.ts";

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
	const { token } = await ctx.modules.tokens.validate({
		token: req.userToken,
	});
	if (token.type !== "user") throw new RuntimeError("TOKEN_NOT_USER_TOKEN");
	const userId = token.meta.userId;

	return { userId };
}
