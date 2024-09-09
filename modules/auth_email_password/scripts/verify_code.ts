import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { ensureNotAssociatedAll } from "../utils/link_assertions.ts";
import { IDENTITY_INFO_PASSWORD } from "../utils/provider.ts";

export interface Request {
	token: string;
	code: string;
}

export interface Response {
	userToken?: string;
}

async function trySignIn(ctx: ScriptContext, email: string): Promise<string | null> {
	// Try signing in with the email, and return the user token if successful.
	try {
		const signInResponse = await ctx.modules.identities.signIn({
			info: IDENTITY_INFO_PASSWORD,
			uniqueData: {
				identifier: email,
			},
		});

		return signInResponse.userToken;
	} catch (e) {
		if (e instanceof RuntimeError && e.code === "identity_provider_not_found") {
			// Email is not associated with an account, we can proceed with signing up.
			return null;
		} else {
			throw e;
		}
	}
}

async function trySignUp(ctx: ScriptContext, email: string): Promise<string> {
	// Ensure email is not associated to ANY account
	await ensureNotAssociatedAll(ctx, email, new Set());

	// Sign up the user with the passwordless email identity
	const signUpResponse = await ctx.modules.identities.signUp({
		info: IDENTITY_INFO_PASSWORD,
		uniqueData: {
			identifier: email,
		},
		additionalData: {},
	});

	return signUpResponse.userToken ;
}


async function doPasswordAction(ctx: ScriptContext, userId: string, data: object) {
	const { meta: hashMeta } = await ctx.modules.userPasswords.meta({ userId });
	if ("newHash" in data && typeof data.newHash === "string") {
		if (hashMeta) throw new RuntimeError("verification_invalidated");
		await ctx.modules.userPasswords.setRawHash({ userId, newHash: data.newHash });
	} else if ("createdAt" in data && typeof data.createdAt === "string") {
		if (!hashMeta) throw new RuntimeError("unknown_err"); 

		if (new Date(hashMeta.updatedAt).getTime() >= new Date(data.createdAt).getTime() - 1000) {
			throw new RuntimeError("verification_invalidated");
		}
	}
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

	// if ("newHash" in data && typeof data.newHash === "string") {
	// 	await ctx.modules.userPasswords.setRawHash({ userId:  })
	// }

	if ("connect" in data && typeof data.connect === "string") {
		// Ensure that the email is not already associated with another account
		await ensureNotAssociatedAll(ctx, data.email, new Set([data.connect]));

		// Either recheck or reset the password
		await doPasswordAction(ctx, data.connect, data);

		const { token: { token: userToken } } = await ctx.modules.users.createToken({ userId: data.connect });

		// Add email/password sign in to the user's account
		await ctx.modules.identities.link({
			userToken,
			info: IDENTITY_INFO_PASSWORD,
			uniqueData: {
				identifier: data.email,
			},
			additionalData: {},
		});

		return {};
	} else if ("signIn" in data && typeof data.signIn === "string") {
		// Check the password hasn't changed
		await doPasswordAction(ctx, data.signIn, data);

		const signInResponse = await ctx.modules.identities.signIn({
			info: IDENTITY_INFO_PASSWORD,
			uniqueData: {
				identifier: data.email,
			},
		});

		return { userToken: signInResponse.userToken };
	} else if ("signUp" in data && data.signUp === true) {
		// Ensure email is not associated to ANY account
		await ensureNotAssociatedAll(ctx, data.email, new Set());


		// Sign up the user with the passwordless email identity
		const signUpResponse = await ctx.modules.identities.signUp({
			info: IDENTITY_INFO_PASSWORD,
			uniqueData: {
				identifier: data.email,
			},
			additionalData: {},
		});

		await doPasswordAction(ctx, signUpResponse.userId, data);

		return { userToken: signUpResponse.userToken };
	} else {
		ctx.log.warn("Unknown type", ["verification_data", JSON.stringify(data)]);
		throw new RuntimeError("unknown_err");
	}
}
