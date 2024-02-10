import { TestContext, Runtime } from "@ogs/runtime";
import config from "../../../dist/runtime_config.ts";
import { assertEquals, assertExists } from "std/assert/mod.ts";
import { TokenUpdate } from "../scripts/revoke.ts";

Runtime.test(config, "tokens", "e2e", async (ctx: TestContext) => {
	const { token } = await ctx.call("tokens", "create", {
		type: "test",
		meta: { foo: "bar" },
	}) as any;

	const getRes = await ctx.call("tokens", "get", {
		tokenIds: [token.id],
	}) as any;
	assertExists(getRes.tokens[token.id]);

	const validateRes = await ctx.call("tokens", "validate", {
		tokens: [token.token],
	}) as any;
	assertExists(validateRes.tokens[token.token]);

	const revokeRes = await ctx.call("tokens", "revoke", {
		tokenIds: [token.id],
	}) as any;
	assertEquals(revokeRes.updates[token.id], TokenUpdate.Revoked);

	const getRes2 = await ctx.call("tokens", "get", {
		tokenIds: [token.id],
	}) as any;
	assertExists(getRes2.tokens[token.id].revoked_at);

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
