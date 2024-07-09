import { test, TestContext } from "../module.gen.ts";
import {
	assertEquals,
	assertExists,
} from "https://deno.land/std@0.217.0/assert/mod.ts";
import { TokenUpdate } from "../scripts/revoke.ts";

test("e2e", async (ctx: TestContext) => {
	const { token } = await ctx.modules.tokens.create({
		type: "test",
		meta: { foo: "bar" },
		expireAt: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
	});

	const getRes = await ctx.modules.tokens.fetch({
		tokenIds: [token.id],
	});
	assertExists(getRes.tokens[0]);

	const fetchByTokenRes = await ctx.modules.tokens.fetchByToken({
		tokens: [token.token],
	});
	assertExists(fetchByTokenRes.tokens[0]);

	const validateRes = await ctx.modules.tokens.validate({
		token: token.token,
	});
	assertEquals(token.id, validateRes.token.id);

	const revokeRes = await ctx.modules.tokens.revoke({
		tokenIds: [token.id],
	});
	assertEquals(revokeRes.updates[token.id], TokenUpdate.Revoked);

	const getAfterRevoke = await ctx.modules.tokens.fetch({
		tokenIds: [token.id],
	});
	assertExists(getAfterRevoke.tokens[0]!.revokedAt);

	const revokeTwiceRes = await ctx.modules.tokens.revoke({
		tokenIds: [token.id],
	});
	assertEquals(revokeTwiceRes.updates[token.id], TokenUpdate.AlreadyRevoked);

	const nonexistentTokenId = crypto.randomUUID();
	const revokeNonexistentRes = await ctx.modules.tokens.revoke({
		tokenIds: [nonexistentTokenId],
	});
	assertEquals(
		revokeNonexistentRes.updates[nonexistentTokenId],
		TokenUpdate.NotFound,
	);
});
