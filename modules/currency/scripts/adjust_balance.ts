import { RuntimeError, ScriptContext, Query, Database } from "../module.gen.ts";

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
	if (!Number.isFinite(req.amount)) {
		throw new RuntimeError("invalid_amount");
	}

	const updatedBalance = await ctx.db.transaction(async tx => {
		const wallet = await tx.query.userWallets.findFirst({
			where: Query.eq(Database.userWallets.userId, req.userId),
		});
		if (wallet) {
			const updatedBalance = wallet.balance + req.amount;
			if (updatedBalance < 0) {
				throw new RuntimeError("not_enough_funds");
			}

			await tx.update(Database.userWallets)
				.set({ balance: updatedBalance })
				.where(Query.eq(Database.userWallets.userId, req.userId))
				.execute();

				return updatedBalance;
		} else {
			if (req.amount < 0) {
				throw new RuntimeError("not_enough_funds");
			}

			await tx.insert(Database.userWallets)
				.values({ userId: req.userId, balance: req.amount })
				.execute();

			return req.amount;
		}
	});

	return {
		updatedBalance,
	};
}
