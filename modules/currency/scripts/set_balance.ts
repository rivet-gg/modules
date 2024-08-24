import { RuntimeError, Query, Database } from "../module.gen.ts";
import { ScriptContext } from "../module.gen.ts";

export interface Request {
	userId: string;
	balance: number;
}

export type Response = Record<string, never>;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	if (req.balance < 0 || !Number.isFinite(req.balance)) {
		throw new RuntimeError("invalid_amount");
	}

	await ctx.db.update(Database.userWallets)
		.set({ balance: req.balance })
		.where(Query.eq(Database.userWallets.userId, req.userId))
		.execute();

	return {};
}
