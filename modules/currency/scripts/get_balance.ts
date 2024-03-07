import { ScriptContext } from "../_gen/scripts/get_balance.ts";

import { getBalance } from "../utils/get_balance.ts";

export interface Request {
	userId: string;
}

export interface Response {
	balance: number;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttle({ requests: 25 });

	return {
		balance: await getBalance(ctx.db, req.userId),
	};
}
