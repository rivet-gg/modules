import { test, TestContext } from "@ogs/helpers/invites/test.ts";
import { assertEquals } from "std/assert/assert_equals.ts";
import { assertExists } from "std/assert/assert_exists.ts";

test("accept", async (ctx: TestContext) => {
	const { user: sender, token: senderToken } = await ctx.modules.users.register(
		{
			username: "sender",
			identity: { guest: {} },
		},
	);
	const { user: recipient, token: recipientToken } = await ctx.modules.users
		.register({
			username: "recipient",
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
