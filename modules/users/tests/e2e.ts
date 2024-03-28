import { test, TestContext } from "../_gen/test.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { assertEquals, assertNotEquals, assertExists } from "https://deno.land/std@0.217.0/assert/mod.ts";

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

	const { userId } = await ctx.modules.users.authenticateUser({
		userToken: token.token,
	});
	assertEquals(user.id, userId);

	const newUsername = faker.internet.userName();
	const { user: updatedUser } = await ctx.modules.users.updateUsername({
		userToken: token.token,
		username: newUsername,
	});
	assertEquals(updatedUser.username, newUsername);

	const { users: updatedUsers } = await ctx.modules.users.getUser({
		userIds: [user.id],
	});
	assertEquals(updatedUsers[0].createdAt, user.createdAt);
	assertNotEquals(updatedUsers[0].updatedAt, user.updatedAt);
	assertEquals(updatedUsers[0].username, newUsername);
});
