import { test, TestContext } from "../_gen/test.ts";
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
