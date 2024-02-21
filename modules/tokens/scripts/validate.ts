import {
	RuntimeError,
	ScriptContext,
} from "@ogs/helpers/tokens/scripts/validate.ts";
import { Token } from "../types/common.ts";

export interface Request {
	token: string;
}

export interface Response {
	token: Token;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const { tokens } = await ctx.call("tokens", "get_by_token", {
		tokens: [req.token],
	});
	const token = tokens[0];

	if (!token) throw new RuntimeError("TOKEN_NOT_FOUND");

	if (token.revokedAt) throw new RuntimeError("TOKEN_REVOKED");

	if (token.expireAt) {
		const expireAt = new Date(token.expireAt);
		const now = new Date();
		if (expireAt < now) {
			throw new RuntimeError("TOKEN_EXPIRED");
		}
	}

	return { token };
}
