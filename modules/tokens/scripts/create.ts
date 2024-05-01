import { ScriptContext } from "../module.gen.ts";
import { TokenWithSecret, tokenFromRowWithSecret, hash } from "../utils/types.ts";

export interface Request {
	type: string;
	meta: { [key: string]: any };
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
	const token = await ctx.db.token.create({
		data: {
			tokenHash: await hash(tokenStr),
			type: req.type,
			meta: req.meta,
			trace: ctx.trace,
			expireAt: req.expireAt,
		},
	});

	return {
		token: tokenFromRowWithSecret(token, tokenStr),
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
		output += CHARACTERS[buf[i] % CHARACTERS.length];
	}

	return `${type}_${output}`;
}
