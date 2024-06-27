import { RuntimeError, test, TestContext } from "../module.gen.ts";
import {
	assertEquals,
	assertGreater,
	assertRejects,
} from "https://deno.land/std@0.217.0/assert/mod.ts";

test(
	"validate token not found",
	async (ctx: TestContext) => {
		const error = await assertRejects(async () => {
			await ctx.modules.tokens.validate({ token: "invalid token" });
		}, RuntimeError);
		assertEquals(error.code, "token_not_found");
	},
);

test(
	"validate token revoked",
	async (ctx: TestContext) => {
		const { token } = await ctx.modules.tokens.create({
			type: "test",
			meta: { foo: "bar" },
		});

		await ctx.modules.tokens.revoke({ tokenIds: [token.id] });

		const error = await assertRejects(async () => {
			await ctx.modules.tokens.validate({ token: token.token });
		}, RuntimeError);
		assertEquals(error.code, "token_revoked");
	},
);

test(
	"validate token expired",
	async (ctx: TestContext) => {
		const { token } = await ctx.modules.tokens.create({
			type: "test",
			meta: { foo: "bar" },
			expireAt: new Date(Date.now() + 1000).toISOString(),
		});

		// Token should be valid
		const validateRes = await ctx.modules.tokens.validate({
			token: token.token,
		});
		assertEquals(token.id, validateRes.token.id);

		// Wait for token to expire
		await new Promise((resolve) => setTimeout(resolve, 1100));

		const error = await assertRejects(async () => {
			await ctx.modules.tokens.validate({ token: token.token });
		}, RuntimeError);
		assertEquals(error.code, "token_expired");
	},
);

test(
	"validate token extended not expired",
	async (ctx: TestContext) => {
		const { token } = await ctx.modules.tokens.create({
			type: "test",
			meta: { foo: "bar" },
			// Set initial expiration to 200ms in the future
			expireAt: new Date(Date.now() + 200).toISOString(),
		});

		// Token should be valid
		const validateRes = await ctx.modules.tokens.validate({
			token: token.token,
		});
		assertEquals(token.id, validateRes.token.id);

		// Extend token expiration by 10 seconds
		await ctx.modules.tokens.extend({
			token: token.token,
			newExpiration: new Date(Date.now() + 10000).toISOString(),
		});

		// Wait for 0.5 seconds to ensure token WOULD HAVE expired without
		// extension.
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Token should STILL be valid, and have a different `expireAt` time
		const validateResAfterWait = await ctx.modules.tokens.validate({
			token: token.token,
		});

		// Assert that everything except `expireAt` is the same and `expireAt`
		// is greater.
		assertGreater(validateResAfterWait.token.expireAt, token.expireAt);
		assertEquals({
			...validateResAfterWait.token,
			expireAt: null,
		}, {
			...token,
			expireAt: null,
		});
	},
);
