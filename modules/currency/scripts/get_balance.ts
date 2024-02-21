import { ScriptContext } from "@ogs/helpers/currency/scripts/get_balance.ts";

import { getBalance } from "../helper/get_balance.ts";

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
	await ctx.call("rate_limit", "throttle", { requests: 25 });
	const { userId } = req;

	return {
		balance: await getBalance(ctx.db, userId)
	};
}
