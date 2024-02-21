import { test, TestContext } from "@ogs/helpers/tokens/test.ts";
import { assertEquals, assertExists } from "std/assert/mod.ts";
import { TokenUpdate } from "../scripts/revoke.ts";

test("e2e", async (ctx: TestContext) => {
	const { token } = await ctx.call("tokens", "create", {
		type: "test",
		meta: { foo: "bar" },
		expireAt: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
	});

	const getRes = await ctx.call("tokens", "get", {
		tokenIds: [token.id],
	});
	assertExists(getRes.tokens[0]);

	const getByTokenRes = await ctx.call("tokens", "get_by_token", {
		tokens: [token.token],
	});
	assertExists(getByTokenRes.tokens[0]);

	const validateRes = await ctx.call("tokens", "validate", {
		token: token.token,
	});
	assertEquals(token.id, validateRes.token.id);

	const revokeRes = await ctx.call("tokens", "revoke", {
		tokenIds: [token.id],
	});
	assertEquals(revokeRes.updates[token.id], TokenUpdate.Revoked);

	const getRes2 = await ctx.call("tokens", "get", {
		tokenIds: [token.id],
	});
	assertExists(getRes2.tokens[0].revokedAt);

	const revokeRes2 = await ctx.call("tokens", "revoke", {
		tokenIds: [token.id],
	});
	assertEquals(revokeRes2.updates[token.id], TokenUpdate.AlreadyRevoked);

	const nonexistentTokenId = crypto.randomUUID();
	const revokeRes3 = await ctx.call("tokens", "revoke", {
		tokenIds: [nonexistentTokenId],
	});
	assertEquals(revokeRes3.updates[nonexistentTokenId], TokenUpdate.NotFound);
});
