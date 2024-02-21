import { test, TestContext } from "@ogs/helpers/invites/test.ts";
import { faker } from "@faker-js/faker";

import { assertExists } from "std/assert/assert_exists.ts";
import { assertGreater } from "std/assert/assert_greater.ts";
import { assertEquals } from "std/assert/assert_equals.ts";

test("get senders", async (ctx: TestContext) => {
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

	const createRes = await ctx.modules.invites.create({
		request_options: {
			directional: false,
			from: sender.id,
			to: recipient.id,
			for: `party_${faker.internet.userName()}`,
			expiration: undefined,
			module: "invites_test",
		},
		token: senderToken.token,
	});
	assertExists(createRes.invite, "Invite was not created");

	const senderAsSenderGetRes = await ctx.modules.invites.get({
		token: senderToken.token,
		getType: "AS_SENDER",
		module: "invites_test",
	});
	assertGreater(
		senderAsSenderGetRes.invites.length,
		0,
		"No invites were found",
	);
	const senderInvite = senderAsSenderGetRes.invites[0];

	assertEquals(
		senderInvite.from,
		sender.id,
		"Invite sender id was not correct",
	);
	assertEquals(
		senderInvite.to,
		recipient.id,
		"Invite recipient id was not correct",
	);

	const recipientAsSenderGetRes = await ctx.modules.invites.get({
		token: recipientToken.token,
		getType: "AS_SENDER",
		module: "invites_test",
	});
	assertEquals(
		recipientAsSenderGetRes.invites.length,
		0,
		`Invites with ${recipient.username} as the sender were found despite ${recipient.username} not being sender of any invites!`,
	);

	const senderAsRecipientGetRes = await ctx.modules.invites.get({
		token: senderToken.token,
		getType: "AS_RECIPIENT",
		module: "invites_test",
	});
	assertEquals(
		senderAsRecipientGetRes.invites.length,
		0,
		`Invites with ${sender.username} as the recipient were found despite ${sender.username} not being recipient of any invites!`,
	);

	const recipientAsRecipientGetRes = await ctx.modules.invites.get({
		token: recipientToken.token,
		getType: "AS_RECIPIENT",
		module: "invites_test",
	});
	assertGreater(
		recipientAsRecipientGetRes.invites.length,
		0,
		"No invites were found",
	);
	const recipientInvite = recipientAsRecipientGetRes.invites[0];

	assertEquals(
		recipientInvite.from,
		sender.id,
		"Invite sender id was not correct",
	);
	assertEquals(
		recipientInvite.to,
		recipient.id,
		"Invite recipient id was not correct",
	);

	const [senderGetAll, recipientGetAll] = await Promise.all([
		ctx.modules.invites.get({
			token: senderToken.token,
			getType: "ALL",
			module: "invites_test",
		}),
		ctx.modules.invites.get({
			token: recipientToken.token,
			getType: "ALL",
			module: "invites_test",
		}),
	]);

	assertEquals(
		senderGetAll.invites,
		recipientGetAll.invites,
		"Invites did not match between sender and recipient",
	);
});
