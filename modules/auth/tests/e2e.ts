import { test, TestContext } from "../module.gen.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";

test("e2e", async (ctx: TestContext) => {
	// First we create a new user, and "register" into the auth
	// using an authEmailPasswordless({ email, userToken })
	// call
	const { user } = await ctx.modules.users.createUser({});

	const { token: session } = await ctx.modules.users.createUserToken({
		userId: user.id
	});

	const fakeEmail = faker.internet.email();

	// Now we test that post-signin, we get the same user
	{
		const authRes = await ctx.modules.auth.authEmailPasswordless({
			email: fakeEmail,
			userToken: session.token
		});

		// Look up correct code
		const { code } = await ctx.db.emailPasswordlessVerification.findFirstOrThrow({
			where: {
				id: authRes.verification.id,
			},
		});

		// Now by verifying the email, we register, and can also use
		// this to verify the token
		const verifyRes = await ctx.modules.auth.verifyEmailPasswordless({
			verificationId: authRes.verification.id,
			code: code,
		});

		assertEquals(verifyRes.token.type, "user");


		// Make sure we end up with the same user we started with
		const verifyRes2 = await ctx.modules.users.authenticateUser({
			userToken: verifyRes.token.token
		});

		assertEquals(verifyRes2.userId, user.id);
	}

	// Now we try logging back in with the same email,
	// but without a token, expecting the same user
	{
		const authRes = await ctx.modules.auth.authEmailPasswordless({
			email: fakeEmail
		});

		// Look up correct code
		const { code: code } = await ctx.db.emailPasswordlessVerification.findFirstOrThrow({
			where: {
				id: authRes.verification.id,
			},
		});

		const verifyRes = await ctx.modules.auth.verifyEmailPasswordless({
			verificationId: authRes.verification.id,
			code: code,
		});

		const verifyRes2 = await ctx.modules.users.authenticateUser({
			userToken: verifyRes.token.token
		});

		assertEquals(verifyRes2.userId, user.id);	
	}
});

