import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { verifyCode } from "../utils/code_management.ts";
import { IDENTITY_INFO_PASSWORDLESS } from "../utils/provider.ts";
import { ensureNotAssociatedAll } from "../utils/link_assertions.ts";

export interface Request {
	verificationToken: string;
	code: string;
}

export interface Response {
	userToken: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	if (ctx.config.mode !== "login") throw new RuntimeError("not_enabled");
	await ctx.modules.rateLimit.throttlePublic({});

	const { email } = await verifyCode(ctx, req.verificationToken, req.code);

	// Try signing in with the email, and return the user token if successful.
	try {
		const signInOrUpResponse = await ctx.modules.identities.signIn({
			info: IDENTITY_INFO_PASSWORDLESS,
			uniqueData: {
				identifier: email,
			},
		});

		return { userToken: signInOrUpResponse.userToken };
	} catch (e) {
		if (e instanceof RuntimeError && e.code === "identity_provider_not_found") {
			// Email is not associated with an account, we can proceed with signing up.
		} else {
			throw e;
		}
	}

	// Ensure email is not associated to ANY account
	await ensureNotAssociatedAll(ctx, email, new Set());

	// Sign up the user with the passwordless email identity
	const signUpResponse = await ctx.modules.identities.signUp({
		info: IDENTITY_INFO_PASSWORDLESS,
		uniqueData: {
			identifier: email,
		},
		additionalData: {},
	});

	return { userToken: signUpResponse.userToken };
}
