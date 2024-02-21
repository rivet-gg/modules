import { test, TestContext } from "@ogs/helpers/invites/test.ts";
import { assertEquals } from "std/assert/assert_equals.ts";
import { assertExists } from "std/assert/assert_exists.ts";

import { faker } from "@faker-js/faker";

test("get expired", async (ctx: TestContext) => {
	const { user: sender, token: senderToken } = await ctx.modules.users.register(
		{
			username: faker.internet.userName(),
			identity: { guest: {} },
		},
	);
	const { user: recipient, token: recipientToken } = await ctx.modules.users
		.register({
			username: faker.internet.userName(),
			identity: { guest: {} },
		});

	assertExists(sender);
	assertExists(recipient);

	const invite = await ctx.modules.invites.create({
		token: senderToken.token,
		request_options: {
			from: sender.id,
			to: recipient.id,
			directional: false,
			for: "test",
			module: "invites_test",
			expiration: {
				ms: 200,
				hidden_after_expiration: false,
			},
		},
	});
	assertExists(invite);

	const { invites: preExpireInvites } = await ctx.modules.invites.get({
		token: recipientToken.token,
		getType: "AS_RECIPIENT",
		module: "invites_test",
	});
	assertExists(preExpireInvites[0]);

	await new Promise((res) => setTimeout(res, 1000));

	const { invites: postAcceptInvites } = await ctx.modules.invites.get({
		token: recipientToken.token,
		getType: "AS_RECIPIENT",
		module: "invites_test",
	});
	assertEquals(
		postAcceptInvites.length,
		0,
		"invite should be removed from regular get after expiration",
	);

	const { invites: expiredInvites } = await ctx.modules.invites.get_expired({
		token: recipientToken.token,
		getType: "AS_RECIPIENT",
		module: "invites_test",
	});
	assertExists(
		expiredInvites[0],
		"invite should be in expired get after expiration",
	);
});
