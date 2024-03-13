import { test, TestContext } from "../_gen/test.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { assertEquals } from "https://deno.land/std@0.217.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.217.0/assert/assert_exists.ts";

test("e2e", async (ctx: TestContext) => {
	const { user } = await ctx.modules.users.createUser({
		username: faker.internet.userName(),
	});

	const { users } = await ctx.modules.users.getUser({
		userIds: [user.id],
	});
	assertExists(users[0]);

	const { token } = await ctx.modules.users.createUserToken({
		userId: user.id,
	});

	const { userId } = await ctx.modules.users.validateUserToken({
		userToken: token.token,
	});
	assertEquals(user.id, userId);
});
