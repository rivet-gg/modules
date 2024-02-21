import { test, TestContext } from "@ogs/helpers/users/test.ts";
import { faker } from "@faker-js/faker";
import { assertExists } from "std/assert/assert_exists.ts";
import { assertEquals } from "std/assert/assert_equals.ts";

test("e2e", async (ctx: TestContext) => {
	const { user, token } = await ctx.call("users", "register", {
		username: faker.internet.userName(),
		identity: { guest: {} },
	});

	const { users: users } = await ctx.call("users", "get", {
		userIds: [user.id],
	});
	assertExists(users[0]);

	const { userId } = await ctx.call("users", "validate_token", {
		userToken: token.token,
	});
	assertEquals(user.id, userId);
});
