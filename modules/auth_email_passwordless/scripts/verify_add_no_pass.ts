import { Empty, RuntimeError, ScriptContext } from "../module.gen.ts";
import { IDENTITY_INFO_PASSWORDLESS, IDENTITY_INFO_LINK } from "../utils/provider.ts";
import { ensureNotAssociatedAll } from "../utils/link_assertions.ts";

export interface Request {
	token: string;
	code: string;
	userToken: string;
}

export type Response = Empty;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
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

	// Ensure that the email is not already associated with another account
	const providedUser = await ctx.modules.users.authenticateToken({
		userToken: req.userToken,
	});
	await ensureNotAssociatedAll(ctx, data.email, new Set([providedUser.userId]));

	// Add email passwordless sign in to the user's account
	await ctx.modules.identities.link({
		userToken: req.userToken,
		info: ctx.config.mode === "link" ? IDENTITY_INFO_LINK : IDENTITY_INFO_PASSWORDLESS,
		uniqueData: {
			identifier: data.email,
		},
		additionalData: {},
	});

	return {};
}
