import { ScriptContext } from "@ogs/runtime";
import { Token } from "../schema/common.ts";

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

	if (!token) throw new Error("Token not found");

	if (token.revoked_at) throw new Error("Token revoked");

	const expireAt = Temporal.PlainDateTime.from(token.expire_at);
	const now = Temporal.Now.plainDateTimeISO();
	if (Temporal.PlainDateTime.compare(expireAt, now) < 1) {
		throw new Error("Token expired");
	}

	return { token };
}
