import { test, TestContext } from "../_gen/test.ts";
import {
	assert,
	assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

test("e2e", async (ctx: TestContext) => {
	const res = await ctx.modules.users.createUserToken({
		// TODO:
	});
});
