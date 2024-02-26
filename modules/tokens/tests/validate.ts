import { RuntimeError, test, TestContext } from "./_gen/test.ts";
import { assertEquals, assertRejects, assertThrows } from "std/assert/mod.ts";

test(
	"validate token not found",
	async (ctx: TestContext) => {
		const error = await assertRejects(async () => {
			await ctx.call("tokens", "validate", { token: "invalid token" }) as any;
		}, RuntimeError);
		assertEquals(error.code, "TOKEN_NOT_FOUND");
	},
);

test(
	"validate token revoked",
	async (ctx: TestContext) => {
		const { token } = await ctx.call("tokens", "create", {
			type: "test",
			meta: { foo: "bar" },
		}) as any;

		await ctx.call("tokens", "revoke", { tokenIds: [token.id] }) as any;

		const error = await assertRejects(async () => {
			await ctx.call("tokens", "validate", { token: token.token }) as any;
		}, RuntimeError);
		assertEquals(error.code, "TOKEN_REVOKED");
	},
);

test(
	"validate token expired",
	async (ctx: TestContext) => {
		const { token } = await ctx.call("tokens", "create", {
			type: "test",
			meta: { foo: "bar" },
			expireAt: new Date(Date.now() + 100).toISOString(),
		}) as any;

		// Token should be valid
		let validateRes = await ctx.call("tokens", "validate", {
			token: token.token,
		}) as any;
		assertEquals(token.id, validateRes.token.id);

		// Wait for token to expire
		await new Promise((resolve) => setTimeout(resolve, 200));

		const error = await assertRejects(async () => {
			await ctx.call("tokens", "validate", { token: token.token }) as any;
		}, RuntimeError);
		assertEquals(error.code, "TOKEN_EXPIRED");
	},
);
