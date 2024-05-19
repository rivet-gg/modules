import { RuntimeError } from "../module.gen.ts";
import { ScriptContext } from "../module.gen.ts";

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
		throw new RuntimeError("invalid_amount");
	}

	try {
		await setBalance(ctx.db, req.userId, req.balance);
	} catch {
		throw new RuntimeError("invalid_amount");
	}

	return {};
}
