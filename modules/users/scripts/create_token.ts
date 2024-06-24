import { TokenWithSecret } from "../../tokens/utils/types.ts";
import { ScriptContext } from "../module.gen.ts";

export interface Request {
	userId: string;
}

export interface Response {
	token: TokenWithSecret;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// Create token
	const { token } = await ctx.modules.tokens.create({
		type: "user",
		meta: { userId: req.userId },
		expireAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
	});

	return { token };
}
