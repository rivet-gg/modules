import { RuntimeError } from "../_gen/scripts/set_balance.ts";
import { ScriptContext } from "../_gen/scripts/set_balance.ts";

import { setBalance } from "../utils/set_balance.ts";

export interface Request {
	userId: string;
	balance: number;
}

export type Response = Record<string, never>;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({ requests: 25 });

	if (req.balance < 0 || !Number.isFinite(req.balance)) {
		throw new RuntimeError("INVALID_AMOUNT");
	}

	try {
		await setBalance(ctx.db, req.userId, req.balance);
	} catch {
		throw new RuntimeError("INVALID_AMOUNT");
	}

	return {};
}
