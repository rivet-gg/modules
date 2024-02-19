import { TestContext, test } from "@ogs/helpers/users/test.ts";
import config from "../../../dist/runtime_config.ts";
import { faker } from "@faker-js/faker";
import { assertExists } from "std/assert/assert_exists.ts";

test("e2e", async (ctx: TestContext) => {
	// const user = await ctx.db.user.create({
	// 	data: {
	// 		username: faker.internet.userName(),
	// 	},
	// });
	// console.log('user', user);

	const { user, token } = await ctx.call("users", "register", {
		username: faker.internet.userName(),
		identity: { guest: {} },
	}) as any;

	const { users: users, token: token2 } = await ctx.call("users", "get", {
		userIds: [user.id],
	}) as any;
	assertExists(users[user.id]);
});
