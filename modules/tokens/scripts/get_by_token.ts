import { ScriptContext } from "@ogs/helpers/tokens/scripts/get_by_token.ts";
import { Token, tokenFromRow } from "../types/common.ts";

export interface Request {
	tokens: string[];
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
			token: {
				in: req.tokens,
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	const tokens = rows.map(tokenFromRow);

	return { tokens };
}
