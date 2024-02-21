import { test, TestContext } from "@ogs/helpers/invites/test.ts";
import { assertEquals } from "std/assert/assert_equals.ts";
import { assertExists } from "std/assert/assert_exists.ts";

import { faker } from "@faker-js/faker";

test("accept", async (ctx: TestContext) => {
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
		},
	});
	assertExists(invite);

	const { invites: preAcceptInvites } = await ctx.modules.invites.get({
		token: recipientToken.token,
		getType: "AS_RECIPIENT",
		module: "invites_test",
	});
	assertExists(preAcceptInvites[0]);

	const { onAcceptResponse } = await ctx.modules.invites.accept({
		token: recipientToken.token,
		details: {
			from: sender.id,
			to: recipient.id,
			directional: false,
			for: "test",
		},
		module: "invites_test",
	});
	assertEquals(
		onAcceptResponse,
		undefined,
		"onAcceptResponse should be undefined because onAccept is not set",
	);

	const { invites: postAcceptInvites } = await ctx.modules.invites.get({
		token: recipientToken.token,
		getType: "AS_RECIPIENT",
		module: "invites_test",
	});
	assertEquals(
		postAcceptInvites.length,
		0,
		"invite should be deleted after accept",
	);
});

test("decline", async (ctx: TestContext) => {
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
		},
	});
	assertExists(invite);

	const { invites: preDeclineInvites } = await ctx.modules.invites.get({
		token: recipientToken.token,
		getType: "AS_RECIPIENT",
		module: "invites_test",
	});
	assertExists(preDeclineInvites[0]);

	const { onDeclineResponse } = await ctx.modules.invites.decline({
		token: recipientToken.token,
		details: {
			from: sender.id,
			to: recipient.id,
			directional: false,
			for: "test",
		},
		module: "invites_test",
	});
	assertEquals(
		onDeclineResponse,
		undefined,
		"onDeclineResponse should be undefined because onDecline is not set",
	);

	const { invites: postDeclineInvites } = await ctx.modules.invites.get({
		token: recipientToken.token,
		getType: "AS_RECIPIENT",
		module: "invites_test",
	});
	assertEquals(
		postDeclineInvites.length,
		0,
		"invite should be deleted after decline",
	);
});

test("cancel", async (ctx: TestContext) => {
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
		},
	});
	assertExists(invite);

	const { invites: preCancelInvites } = await ctx.modules.invites.get({
		token: senderToken.token,
		getType: "AS_SENDER",
		module: "invites_test",
	});
	assertExists(preCancelInvites[0]);

	await ctx.modules.invites.cancel({
		token: senderToken.token,
		details: {
			from: sender.id,
			to: recipient.id,
			directional: false,
			for: "test",
		},
		module: "invites_test",
	});

	const { invites: postCancelInvites } = await ctx.modules.invites.get({
		token: senderToken.token,
		getType: "AS_SENDER",
		module: "invites_test",
	});
	assertEquals(
		postCancelInvites.length,
		0,
		"invite should be deleted after decline",
	);
});
