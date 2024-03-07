import { RuntimeError, test, TestContext } from "../_gen/test.ts";
import {
	assertEquals,
	assertRejects,
} from "https://deno.land/std@0.217.0/assert/mod.ts";

test(
	"validate token not found",
	async (ctx: TestContext) => {
		const error = await assertRejects(async () => {
			await ctx.modules.tokens.validate({ token: "invalid token" });
		}, RuntimeError);
		assertEquals(error.code, "TOKEN_NOT_FOUND");
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
		assertEquals(error.code, "TOKEN_REVOKED");
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
		assertEquals(error.code, "TOKEN_EXPIRED");
	},
);
