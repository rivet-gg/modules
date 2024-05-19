import { ScriptContext } from "../module.gen.ts";

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
	await ctx.modules.rateLimit.throttlePublic({ requests: 25 });

	const { userId } = await ctx.modules.users.authenticateUser({
		userToken: req.userToken,
	});
	const { balance } = await ctx.modules.currency.getBalance({ userId });

	return {
		userId,
		balance,
	};
}
