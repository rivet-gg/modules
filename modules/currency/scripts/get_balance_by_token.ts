import { ScriptContext } from "../_gen/scripts/get_balance_by_token.ts";

export interface Request {
	userToken: string;
}

export interface Response {
	userId: string;
	balance: number;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", { requests: 25 });

	const { userId } = await ctx.call("users", "validate_token", {
		userToken: req.userToken,
	}) as any;

	const { balance } = await ctx.call("currency", "get_balance", {
		userId,
	}) as any;

	return {
		userId,
		balance,
	};
}
