import { test, TestContext } from "../_gen/test.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { TokenUpdate } from "../scripts/revoke.ts";

test("e2e", async (ctx: TestContext) => {
	const { token } = await ctx.call("tokens", "create", {
		type: "test",
		meta: { foo: "bar" },
		expireAt: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
	}) as any;

	const getRes = await ctx.call("tokens", "get", {
		tokenIds: [token.id],
	}) as any;
	assertExists(getRes.tokens[0]);

	const getByTokenRes = await ctx.call("tokens", "get_by_token", {
		tokens: [token.token],
	}) as any;
	assertExists(getByTokenRes.tokens[0]);

	const validateRes = await ctx.call("tokens", "validate", {
		token: token.token,
	}) as any;
	assertEquals(token.id, validateRes.token.id);

	const revokeRes = await ctx.call("tokens", "revoke", {
		tokenIds: [token.id],
	}) as any;
	assertEquals(revokeRes.updates[token.id], TokenUpdate.Revoked);

	const getRes2 = await ctx.call("tokens", "get", {
		tokenIds: [token.id],
	}) as any;
	assertExists(getRes2.tokens[0].revokedAt);

	const revokeRes2 = await ctx.call("tokens", "revoke", {
		tokenIds: [token.id],
	}) as any;
	assertEquals(revokeRes2.updates[token.id], TokenUpdate.AlreadyRevoked);

	const nonexistentTokenId = crypto.randomUUID();
	const revokeRes3 = await ctx.call("tokens", "revoke", {
		tokenIds: [nonexistentTokenId],
	}) as any;
	assertEquals(revokeRes3.updates[nonexistentTokenId], TokenUpdate.NotFound);
});
