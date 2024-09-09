import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { ensureNotAssociatedAll } from "../utils/link_assertions.ts";
import { IDENTITY_INFO_LINK, IDENTITY_INFO_PASSWORDLESS } from "../utils/provider.ts";

export interface Request {
	token: string;
	code: string;
}

export interface Response {
	userToken?: string;
}

export async function run(ctx: ScriptContext, req: Request): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

	// Verify that the code is correct and valid
	const { data, succeeded } = await ctx.modules.verifications.attempt({ token: req.token, code: req.code });
	if (!succeeded) throw new RuntimeError("invalid_code");

	if (
		typeof data !== "object" ||
		data === null ||
		!("email" in data) ||
		typeof data.email !== "string"
	) throw new RuntimeError("unknown_err");

	if ("connect" in data && typeof data.connect === "string") {
		// Ensure that the email is not already associated with another account
		await ensureNotAssociatedAll(ctx, data.email, new Set([data.connect]));

		const { token: { token: userToken } } = await ctx.modules.users.createToken({ userId: data.connect });

		// Add email passwordless sign in to the user's account
		await ctx.modules.identities.link({
			userToken,
			info: ctx.config.mode === "link" ? IDENTITY_INFO_LINK : IDENTITY_INFO_PASSWORDLESS,
			uniqueData: {
				identifier: data.email,
			},
			additionalData: {},
		});

		return {};
	} else if ("signIn" in data && typeof data.signIn === "string") {
		if (ctx.config.mode !== "login") throw new RuntimeError("not_enabled");

		const signInResponse = await ctx.modules.identities.signIn({
			info: IDENTITY_INFO_PASSWORDLESS,
			uniqueData: {
				identifier: data.email,
			},
		});

		return { userToken: signInResponse.userToken };
	} else if ("signUp" in data && data.signUp === true) {
		if (ctx.config.mode !== "login") throw new RuntimeError("not_enabled");
			
		// Ensure email is not associated to ANY account
		await ensureNotAssociatedAll(ctx, data.email, new Set());

		// Sign up the user with the passwordless email identity
		const signUpResponse = await ctx.modules.identities.signUp({
			info: IDENTITY_INFO_PASSWORDLESS,
			uniqueData: {
				identifier: data.email,
			},
			additionalData: {},
		});

		return { userToken: signUpResponse.userToken };
	} else {
		throw new RuntimeError("unknown_err");
	}
}
