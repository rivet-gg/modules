import { RuntimeError, ScriptContext } from "@ogs/helpers/tokens/validate.ts";
import { Token } from "../types/common.ts";

export interface Request {
	token: string;
}

export interface Response {
	token: Token;
}

export async function handler(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const { tokens } = await ctx.call("tokens", "get_by_token", {
		tokens: [req.token],
	}) as any;
	const token = tokens[req.token];

	if (!token) throw new RuntimeError("TOKEN_NOT_FOUND");

	if (token.revoked_at) throw new RuntimeError("TOKEN_REVOKED");

	if (token.expire_at) {
		const expireAt = Temporal.PlainDateTime.from(token.expire_at);
		const now = Temporal.Now.plainDateTimeISO();
		if (Temporal.PlainDateTime.compare(expireAt, now) < 1) {
			throw new RuntimeError("TOKEN_EXPIRED");
		}
	}

	return { token };
}
