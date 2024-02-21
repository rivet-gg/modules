import { ScriptContext } from "@ogs/helpers/currency/scripts/get_balance.ts";

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

	const user = await ctx.db.userWallet.findFirst({
		where: {
			userId,
		},
		select: {
			balance: true,
		},
	});

	if (!user) {
		return {
			balance: 0,
		};
	}

	return {
		balance: user.balance,
	};
}
