import { ScriptContext } from "../module.gen.ts";
import { Token } from "../utils/types.ts";
import { tokenFromRow } from "../utils/types.ts";

export interface Request {
	tokenIds: string[];
}

export interface Response {
	tokens: Token[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const rows = await ctx.db.token.findMany({
		where: {
			id: { in: req.tokenIds },
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	const tokens = rows.map(tokenFromRow);

	return { tokens };
}
