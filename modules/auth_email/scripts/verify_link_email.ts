import { Empty, ScriptContext } from "../module.gen.ts";
import { verifyCode } from "../utils/code_management.ts";
import { IDENTITY_INFO_LINK } from "../utils/provider.ts";
import { ensureNotAssociatedAll } from "../utils/link_assertions.ts";

export interface Request {
	verificationToken: string;
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
	const { email } = await verifyCode(ctx, req.verificationToken, req.code);

	// Ensure that the email is not already associated with another account
	const providedUser = await ctx.modules.users.authenticateTokenInternal({
		userToken: req.userToken,
	});
	await ensureNotAssociatedAll(ctx, email, new Set([providedUser.userId]));

	// Link the email to the user's account
	await ctx.modules.identities.link({
		userToken: req.userToken,
		info: IDENTITY_INFO_LINK,
		uniqueData: {
			identifier: email,
		},
		additionalData: {},
	});

	return {};
}
