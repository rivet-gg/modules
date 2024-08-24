import { ScriptContext } from "../module.gen.ts";
import { IDENTITY_INFO_PASSWORD } from "../utils/provider.ts";

export interface Request {
	email: string;
	password: string;
}

export interface Response {
	userToken: string;
	userId: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

	// Try signing in with the email
	const { userToken, userId } = await ctx.modules.identities.signIn({
		info: IDENTITY_INFO_PASSWORD,
		uniqueData: {
			identifier: req.email,
		},
	});

	// Verify the password
	await ctx.modules.userPasswords.verify({
		userId,
		password: req.password,
	});

	return { userToken, userId };
}
