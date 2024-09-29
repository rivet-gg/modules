import { TokenWithSecret } from "../../tokens/utils/types.ts";
import { RuntimeError } from "../module.gen.ts";
import { ScriptContext } from "../module.gen.ts";

export interface Request {
	username: string;
	password: string;
}

export interface Response {
	token: TokenWithSecret;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

	const { users: [user] } = await ctx.modules.users.fetchByUsername({
		usernames: [req.username],
	});

	if (!user) throw new RuntimeError("invalid_username_or_password");

	const { id } = user;

	try {
		await ctx.modules.userPasswords.verify({
			userId: id,
			password: req.password,
		});
	} catch (e) {
		if (e instanceof RuntimeError) {
			throw new RuntimeError("invalid_username_or_password");
		} else {
			throw e;
		}
	}

	return await ctx.modules.users.createToken({ userId: id });
}
