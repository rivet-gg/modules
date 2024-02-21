import { RuntimeError } from "@ogs/helpers/currency/scripts/give_user.ts";
import { ScriptContext } from "@ogs/helpers/currency/scripts/give_user.ts";

import { getBalance } from "../helper/get_balance.ts";
import { setBalance } from "../helper/set_balance.ts";

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

	const { userId, amount } = req;

	if (amount < 0) throw new RuntimeError("INVALID_AMOUNT");

	return ctx.db.$transaction(async (tx) => {
		const balance = await getBalance(tx, userId);

		const updatedBalance = balance + amount;

		if (updatedBalance < 0) throw new RuntimeError("NOT_ENOUGH_FUNDS");

		await setBalance(tx, userId, updatedBalance);

		return {
			updatedBalance,
		};
	});
}
