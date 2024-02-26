import { test, TestContext } from "@gen/users/test.ts";
import { faker } from "npm:@faker-js/faker@^8.4.1";
import {
	assertEquals,
	assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

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
