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

	const { users: [existing] } = await ctx.modules.users.fetchByUsername({
		usernames: [req.username],
	});

	if (existing) throw new RuntimeError("user_already_exists");

	const { user } = await ctx.modules.users.create({
		username: req.username,
	});

	await ctx.modules.userPasswords.add({
		userId: user.id,
		password: req.password,
	});

	// Sign in the user
	return await ctx.modules.authUsernamePassword.signIn(req);
}
