import { ScriptContext } from "../module.gen.ts";
import { Token, tokenFromRowWithSecret, hash } from "../utils/types.ts";

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
	const hashed = await Promise.all(req.tokens.map(hash));
	console.log(hashed);
	const rows = await ctx.db.token.findMany({
		where: {
			tokenHash: {
				in: hashed,
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	// Map from the hashed secrets to the original secrets
	const hashMap = Object.fromEntries(req.tokens.map((token, i) => [hashed[i], token]));
	const tokens = rows.map(row => tokenFromRowWithSecret(row, hashMap[row.tokenHash]));

	return { tokens };
}
