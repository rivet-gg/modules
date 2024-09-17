import { ScriptContext, Database, Query } from "../module.gen.ts";
import { TokenWithSecret, tokenFromRow, tokenWithSecretFromRow } from "../utils/types.ts";

export interface Request {
	type: string;
	meta: Record<string, string>;
	expireAt?: string;
}

export interface Response {
	token: TokenWithSecret;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const tokenStr = generateToken(req.type);

	const rows = await ctx.db.insert(Database.tokens)
    .values({
      token: tokenStr,
      type: req.type,
      meta: req.meta,
      trace: ctx.trace,
      expireAt: req.expireAt ? new Date(req.expireAt) : undefined,
    })
    .returning();

	return {
		token: tokenWithSecretFromRow(rows[0]!),
	};
}

/** Characters that can be included in the token. */
const CHARACTERS =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generates a new cryptographically secure token.
 *
 * The format will be `${type}_${random_characters}`.
 */
function generateToken(type: string): string {
	const len = 40;

	// Select random numbers
	const buf = new Uint32Array(len);
	crypto.getRandomValues(buf);

	// Map to characters
	let output = "";
	for (let i = 0; i < buf.length; i++) {
		output += CHARACTERS[buf[i]! % CHARACTERS.length];
	}

	return `${type}_${output}`;
}
