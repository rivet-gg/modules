import { test, TestContext } from "../_gen/test.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { assertEquals } from "https://deno.land/std@0.217.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.217.0/assert/assert_exists.ts";

test("e2e", async (ctx: TestContext) => {
	const { user, token } = await ctx.modules.users.register({
		username: faker.internet.userName(),
		identity: { guest: {} },
	});

	const { users } = await ctx.modules.users.get({
		userIds: [user.id],
	});
	assertExists(users[0]);

	const { userId } = await ctx.modules.users.validateToken({
		userToken: token.token,
	});
	assertEquals(user.id, userId);
});
