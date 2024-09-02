import { TestContext, Query, Database } from "../module.gen.ts";
import {
	assertEquals,
	assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

export async function getVerification(ctx: TestContext, email: string) {
	// Get a valid verification
	const { verification: { token: verificationToken } } = await ctx.modules.authEmailPasswordless
		.sendVerification({ email });
	const verification = await ctx.db.query.verifications.findFirst({
			where: Query.eq(Database.verifications.token, verificationToken),
		});
	assertExists(verification);

	return { verificationToken, code: verification.code };
}

export async function verifyProvider(
	ctx: TestContext,
	userToken: string,
	email: string,
	provider: unknown,
) {
	// Get the providers associated with the user
	const { identityProviders: [emailProvider] } = await ctx.modules.identities
		.list({ userToken });
	assertEquals(emailProvider, provider);
	assertExists(emailProvider);

	// Verify that the provider data is correct
	const { data } = await ctx.modules.identities.fetch({
		userToken,
		info: emailProvider,
	});
	assertExists(data);

	const { uniqueData, additionalData } = data;
	assertEquals(uniqueData, { identifier: email });
	assertEquals(additionalData, {});
}

export async function checkLogin(
	ctx: TestContext,
	origUser: { username: string; id: string },
	newToken: string,
) {
	const { userId: signedInUserId, user: signedInUser } = await ctx.modules.users
		.authenticateToken({
			userToken: newToken,
			fetchUser: true,
		});
	assertEquals(signedInUserId, origUser.id);
	assertEquals(signedInUser?.username, origUser.username);
}
