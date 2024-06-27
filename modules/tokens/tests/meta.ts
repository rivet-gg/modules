import { test, TestContext } from "../module.gen.ts";
import {
	assertEquals,
	assertExists,
	assertRejects,
} from "https://deno.land/std@0.217.0/assert/mod.ts";
import { RuntimeError } from "../module.gen.ts";

const METADATA_PRE = { state: "beforeModify" };
const METADATA_POST = { state: "afterModify" };

test("modify_meta", async (ctx: TestContext) => {
	const { token } = await ctx.modules.tokens.create({
		type: "test",
		meta: METADATA_PRE,
	});

	const { tokens: [tokenPre] } = await ctx.modules.tokens.fetch({
		tokenIds: [token.id],
	});
	assertExists(tokenPre);
	// assertEquals(typeof tokenPre.meta, "string");
	assertEquals(tokenPre.meta, METADATA_PRE);

	const { oldMeta: fetchedOldMeta, token: tokenPost } = await ctx.modules.tokens
		.modifyMeta({
			token: token.token,
			newMeta: METADATA_POST,
		});
	assertExists(tokenPost);
	assertEquals(tokenPost.meta, METADATA_POST);
	assertEquals(fetchedOldMeta, METADATA_PRE);

	await ctx.modules.tokens.revoke({ tokenIds: [token.id] });

	const err = await assertRejects(() =>
		ctx.modules.tokens.modifyMeta({
			token: token.token,
			newMeta: METADATA_POST,
		}), RuntimeError);
	assertEquals(err.code, "token_revoked");
});
