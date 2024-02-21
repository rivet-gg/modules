import { test, TestContext } from "@ogs/helpers/invites/test.ts";
import { assertExists } from "std/assert/assert_exists.ts";

test("e2e", async (ctx: TestContext) => {
	const res = await ctx.call("invites", "clean_expired", {
		// TODO:
	}) as any;
});
