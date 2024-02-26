import { ScriptContext } from "../_gen/scripts/validate_token.ts";

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
	const { token } = await ctx.call("tokens", "validate", {
		token: req.userToken,
	}) as any;
	if (token.type !== "user") throw new Error("Token is not a user token");
	const userId = token.meta.userId;

	return { userId };
}
