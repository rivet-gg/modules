import { test, TestContext } from "../module.gen.ts";
import {
	assertEquals,
	assertExists,
} from "https://deno.land/std@0.217.0/assert/mod.ts";

const METADATA = { meta: "data", test: "data" };

test("get_and_check_meta", async (ctx: TestContext) => {
	const { token } = await ctx.modules.tokens.create({
		type: "test",
		meta: METADATA,
	});

	const { tokens: [returnedToken] } = await ctx.modules.tokens.fetch({
		tokenIds: [token.id],
	});
	assertExists(returnedToken);
	assertEquals(returnedToken.meta, METADATA);
});
