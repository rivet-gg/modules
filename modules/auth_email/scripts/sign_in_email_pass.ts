import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { IDENTITY_INFO_PASSWORD } from "../utils/provider.ts";

export interface Request {
	email: string;
	password: string;
}

export interface Response {
	userToken: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});
	if (!ctx.config.enable.withPassword) {
		throw new RuntimeError("provider_disabled");
	}

	// Try signing in with the email
	const { userToken } = await ctx.modules.identities.signIn({
		info: IDENTITY_INFO_PASSWORD,
		uniqueData: {
			identifier: req.email,
		},
	});

	// Look up the user ID
	const { userId } = await ctx.modules.users.authenticateToken({ userToken });

	// Verify the password
	await ctx.modules.userPasswords.verify({
		userId,
		password: req.password,
	});

	return { userToken };
}
