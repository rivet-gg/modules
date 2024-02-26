import { test, TestContext } from "@ogs/helpers/users/test.ts";
import { faker } from "@faker-js/faker";
import { assertExists } from "std/assert/assert_exists.ts";
import { assertEquals } from "std/assert/assert_equals.ts";

test("e2e", async (ctx: TestContext) => {
	const { user, token } = await ctx.call("users", "register", {
		username: faker.internet.userName(),
		identity: { guest: {} },
	}) as any;

	const { users: users, token: token2 } = await ctx.call("users", "get", {
		userIds: [user.id],
	}) as any;
	assertExists(users[0]);

	const { userId } = await ctx.call("users", "validate_token", {
		userToken: token.token,
	}) as any;
	assertEquals(user.id, userId);
});
