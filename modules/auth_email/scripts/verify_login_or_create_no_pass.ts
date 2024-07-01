import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { verifyCode } from "../utils/code_management.ts";
import { IDENTITY_INFO_PASSWORDLESS } from "../utils/provider.ts";
import { ensureNotAssociatedAll } from "../utils/link_assertions.ts";

export interface Request {
	verificationId: string;
	code: string;
}

export interface Response {
	userToken: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});
	if (!ctx.config.enable.passwordless) {
		throw new RuntimeError("provider_disabled");
	}

	const { email } = await verifyCode(ctx, req.verificationId, req.code);

	// Try signing in with the email, and return the user token if successful.
	try {
		const signInOrUpResponse = await ctx.modules.identities.signIn({
			info: IDENTITY_INFO_PASSWORDLESS,
			uniqueData: {
				identifier: email,
			},
		});

		return { userToken: signInOrUpResponse.userToken };
	} catch {
		// Email is not associated with an account, we can proceed with signing up.
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
