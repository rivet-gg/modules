import { RuntimeError, ScriptContext } from "../module.gen.ts";
import {
	IDENTITY_INFO_LINK,
	IDENTITY_INFO_PASSWORD,
	IDENTITY_INFO_PASSWORDLESS,
} from "./provider.ts";

export async function ensureNotAssociated(
	ctx: ScriptContext,
	providerInfo:
		| typeof IDENTITY_INFO_LINK
		| typeof IDENTITY_INFO_PASSWORDLESS
		| typeof IDENTITY_INFO_PASSWORD,
	email: string,
	shouldRejectOnExistence: (
		linked: { userId: string; userToken: string },
	) => boolean | Promise<boolean>,
) {
	// Ensure that the email is not already associated with another account
	let existingIdentity: { userToken: string };
	try {
		existingIdentity = await ctx.modules.identities.signIn({
			info: providerInfo,
			uniqueData: {
				identifier: email,
			},
		});
	} catch (e) {
		if (e instanceof RuntimeError && e.code === "identity_provider_not_found") {
			// If the email is not associated in this way, the "sign in" will error and put us here.
			ctx.log.info(
				"Email is confirmed to not be associated with another account thru this provider",
				["email", email],
				["provider", JSON.stringify(providerInfo)],
			);
			return;
		} else {
			// If this is some other error, rethrow it, because it isn't
			// NECESSARILY what we want.
			throw e;
		}
	}
	// Email matches an existing identity using this provider
	const existingUser = await ctx.modules.users.authenticateToken(
		existingIdentity,
	);

	if (
		await shouldRejectOnExistence({
			userId: existingUser.userId,
			userToken: existingIdentity.userToken,
		})
	) {
		ctx.log.error(
			"Email is already associated with another account",
			["email", email],
			["existingUser", existingUser.userId],
			["existingUserToken", existingIdentity.userToken],
			["provider", JSON.stringify(providerInfo)],
		);

		// Revoke the user token just in case
		const { tokens } = await ctx.modules.tokens.fetchByToken({
			tokens: [existingIdentity.userToken],
		});
		await ctx.modules.tokens.revoke({
			tokenIds: tokens.map((token) => token.id),
		});

		// Reject the request because the email is already associated with some
		// account in some incompatible way
		throw new RuntimeError("email_in_use");
	} else {
		ctx.log.info(
			"Email is already associated with an account, but that is okay in this case",
			["email", email],
			["existingUser", existingUser.userId],
			["existingUserToken", existingIdentity.userToken],
			["provider", JSON.stringify(providerInfo)],
		);

		// Revoke the user token just in case
		const { tokens } = await ctx.modules.tokens.fetchByToken({
			tokens: [existingIdentity.userToken],
		});
		await ctx.modules.tokens.revoke({
			tokenIds: tokens.map((token) => token.id),
		});
	}
}

export async function ensureNotAssociatedAll(
	ctx: ScriptContext,
	email: string,
	allowedUserIds: Set<string>,
) {
	const idDoesntMatch = (linked: { userId: string }) =>
		!allowedUserIds.has(linked.userId);
	await ensureNotAssociated(
		ctx,
		IDENTITY_INFO_PASSWORDLESS,
		email,
		idDoesntMatch,
	);
	await ensureNotAssociated(ctx, IDENTITY_INFO_PASSWORD, email, idDoesntMatch);
	await ensureNotAssociated(ctx, IDENTITY_INFO_LINK, email, idDoesntMatch);
}
