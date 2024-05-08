import { test, TestContext } from "../module.gen.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";

test("e2e", async (ctx: TestContext) => {
	const authRes = await ctx.modules.auth.authEmailPasswordless({
		email: faker.internet.email(),
	});

	// Look up correct code
	const { code } = await ctx.db.emailPasswordlessVerification.findFirstOrThrow({
		where: {
			id: authRes.verification.id,
		},
	});

	const verifyRes = await ctx.modules.auth.verifyEmailPasswordless({
		verificationId: authRes.verification.id,
		code: code,
	});
	assertEquals(verifyRes.token.type, "user");
});


test("e2e with user token", async (ctx: TestContext) => {
	const { user } = await ctx.modules.users.createUser({});

	const { token: session } = await ctx.modules.users.createUserToken({
		userId: user.id
	});

	const authRes = await ctx.modules.auth.authEmailPasswordless({
		email: faker.internet.email(),
		userToken: session.token
	});

	// Look up correct code
	const { code } = await ctx.db.emailPasswordlessVerification.findFirstOrThrow({
		where: {
			id: authRes.verification.id,
		},
	});

	const verifyRes = await ctx.modules.auth.verifyEmailPasswordless({
		verificationId: authRes.verification.id,
		code: code,
	});

	assertEquals(verifyRes.token.type, "user");

	const verifyRes2 = await ctx.modules.users.authenticateUser({
		userToken: verifyRes.token.token
	});

	assertEquals(verifyRes2.userId, user.id);
});
