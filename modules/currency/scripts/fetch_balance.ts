import { ScriptContext, Query, Database } from "../module.gen.ts";

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
	const user = await ctx.db.query.userWallets.findFirst({
		where: Query.eq(Database.userWallets.userId, req.userId),
	});

	return {
		balance: user?.balance ?? 0,
	};
}
