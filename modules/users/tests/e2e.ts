import { Runtime, TestContext } from "@ogs/runtime";
import config from "../../../dist/runtime_config.ts";
import { faker } from "@faker-js/faker";
import { assertExists } from "std/assert/assert_exists.ts";

Runtime.test(config, "users", "register guest", async (ctx: TestContext<any>) => {
	const { user, token } = await ctx.call("users", "register", {
		username: faker.internet.userName(),
		identity: { guest: {} },
	}) as any;

	const { users: users, token: token2 } = await ctx.call("users", "get", {
		userIds: [user.id],
	}) as any;
	assertExists(users[user.id]);
});
