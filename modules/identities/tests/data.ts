import { test, TestContext } from "../module.gen.ts";
import {
	assertEquals,
	assertExists,
} from "https://deno.land/std@0.217.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { signInWithTest, signUpWithTest } from "./sign_up.ts";

test("Test Data Modification", async (ctx: TestContext) => {
	const username = faker.internet.userName();
	const uniqueData = { unique: faker.random.alphaNumeric(10) };
	const additionalData = { additional: faker.random.alphaNumeric(100) };

	const signUpRes = await signUpWithTest(
		ctx,
		username,
		uniqueData,
		additionalData,
	);

	// Validate the identity data
	{
		const { data } = await ctx.modules.identities.fetch({
			userToken: signUpRes.userToken,
			info: {
				identityType: "test",
				identityId: "test",
			},
		});
		assertExists(data);
		assertEquals(data.uniqueData, uniqueData);
		assertEquals(data.additionalData, additionalData);
	}

	// Sign in with the same identity and verify that the user is the same
	const signInRes = await signInWithTest(ctx, uniqueData);
	assertEquals(signUpRes.userId, signInRes.userId);
	assertEquals(signUpRes.user, signInRes.user);

	// Modify the identity data
	const newUniqueData = { unique: faker.random.alphaNumeric(10) };
	const newAdditionalData = { additional: faker.random.alphaNumeric(100) };

	await ctx.modules.identities.set({
		userToken: signUpRes.userToken,
		info: {
			identityType: "test",
			identityId: "test",
		},
		uniqueData: newUniqueData,
		additionalData: newAdditionalData,
	});

	// Validate the identity data
	{
		const { data } = await ctx.modules.identities.fetch({
			userToken: signUpRes.userToken,
			info: {
				identityType: "test",
				identityId: "test",
			},
		});
		assertExists(data);
		assertEquals(data.uniqueData, newUniqueData);
		assertEquals(data.additionalData, newAdditionalData);
	}
});
