import { TestContext } from "../module.gen.ts";
import {
	assertEquals,
	assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

export async function getVerification(ctx: TestContext, token: string) {
	const { verification } = await ctx.modules.verifications.get({ token });
	assertExists(verification);

	return verification;
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
