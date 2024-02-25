import { RuntimeError } from "@ogs/helpers/currency/scripts/set_balance.ts";
import { ScriptContext } from "@ogs/helpers/currency/scripts/set_balance.ts";

import { setBalance } from "../utils/db/set_balance.ts";

export interface Request {
	userId: string;
	balance: number;
}

export interface Response {}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", { requests: 25 });

	if (req.balance < 0) throw new RuntimeError("INVALID_AMOUNT");

	try {
		await setBalance(ctx.db, req.userId, req.balance);
	} catch {
		throw new RuntimeError("INVALID_BALANCE");
	}

	return {};
}
