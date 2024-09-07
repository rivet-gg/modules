import { test, TestContext } from "../module.gen.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { assertEquals } from "https://deno.land/std@0.217.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.217.0/assert/assert_exists.ts";

test("e2e", async (ctx: TestContext) => {
	const { user } = await ctx.modules.users.create({
		username: faker.internet.userName(),
	});

	const { users } = await ctx.modules.users.fetch({
		userIds: [user.id],
	});
	assertExists(users[0]);

	const { token } = await ctx.modules.users.createToken({
		userId: user.id,
	});

	const { userId } = await ctx.modules.users.authenticateTokenInternal({
		userToken: token.token,
	});
	assertEquals(user.id, userId);
});
