import {
	RuntimeError,
	ScriptContext,
} from "@ogs/helpers/currency/scripts/deposit.ts";

import { getBalance } from "../utils/db/get_balance.ts";
import { setBalance } from "../utils/db/set_balance.ts";

export interface Request {
	userId: string;
	amount: number;
}

export interface Response {
	updatedBalance: number;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", { requests: 25 });

	if (req.amount < 0) throw new RuntimeError("INVALID_AMOUNT");

	return ctx.db.$transaction(async (tx) => {
		const balance = await getBalance(tx, req.userId);

		const updatedBalance = balance + req.amount;

		if (updatedBalance < 0) throw new RuntimeError("NOT_ENOUGH_FUNDS");

		try {
			await setBalance(tx, req.userId, updatedBalance);
		} catch {
			throw new RuntimeError("INVALID_BALANCE");
		}

		return {
			updatedBalance,
		};
	});
}
