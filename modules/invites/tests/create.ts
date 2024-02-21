import { RuntimeError, test, TestContext } from "@ogs/helpers/invites/test.ts";
import { faker } from "@faker-js/faker";

import { assertEquals } from "std/assert/assert_equals.ts";
import { assertAlmostEquals } from "std/assert/assert_almost_equals.ts";
import { assertRejects } from "std/assert/assert_rejects.ts";

test("create success", async (ctx: TestContext) => {
	const { user: sender, token: senderToken } = await ctx.modules.users.register({
		username: faker.internet.userName(),
		identity: { guest: {} },
	});

	const { user: recipient } = await ctx.modules.users.register({
		username: faker.internet.userName(),
		identity: { guest: {} },
	});

	const res = await ctx.modules.invites.create({
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

	assertEquals(res.invite.from, sender.id, "Sender ID did not match");
	assertEquals(res.invite.to, recipient.id, "Recipient ID did not match");
	assertEquals(res.invite.module, "invites_test", "Originating did not match");
});

test("bad user data", async (ctx: TestContext) => {
	const { user: sender, token: senderToken } = await ctx.modules.users.register({
		username: faker.internet.userName(),
		identity: { guest: {} },
	});

	const { user: recipient } = await ctx.modules.users.register({
		username: faker.internet.userName(),
		identity: { guest: {} },
	});

	await assertRejects(async () => {
		await ctx.modules.invites.create({
			request_options: {
				directional: false,
				from: sender.id,
				to: recipient.id,
				for: `party_${faker.internet.userName()}`,
				expiration: undefined,
				module: "invites_test",
			},
			token: "token_invalid_token_example",
		})
	}, RuntimeError, "INVALID_SENDER_TOKEN");

	await assertRejects(async () => {
		await ctx.modules.invites.create({
			request_options: {
				directional: false,
				from: "00000000-0000-0000-0000-000000000000",
				to: recipient.id,
				for: `party_${faker.internet.userName()}`,
				expiration: undefined,
				module: "invites_test",
			},
			token: senderToken.token,
		})
	}, RuntimeError, "SENDER_USER_NOT_FOUND");

	await assertRejects(async () => {
		await ctx.modules.invites.create({
			request_options: {
				directional: false,
				from: sender.id,
				to: "00000000-0000-0000-0000-000000000000",
				for: `party_${faker.internet.userName()}`,
				expiration: undefined,
				module: "invites_test",
			},
			token: senderToken.token,
		})
	}, RuntimeError, "RECIPIENT_USER_NOT_FOUND");
});

test("expiration time", async (ctx: TestContext) => {
	const { user: sender, token: senderToken } = await ctx.modules.users.register({
		username: faker.internet.userName(),
		identity: { guest: {} },
	});

	const { user: recipient } = await ctx.modules.users.register({
		username: faker.internet.userName(),
		identity: { guest: {} },
	});

	const expiration = {
		ms: 10000,
		hidden_after_expiration: true,
	};

	const { invite } = await ctx.modules.invites.create({
		request_options: {
			directional: false,
			from: sender.id,
			to: recipient.id,
			for: `party_${faker.internet.userName()}`,
			expiration,
			module: "invites_test",
		},
		token: senderToken.token,
	});

	

	assertAlmostEquals(invite.expiration?.ms ?? -1, expiration.ms, 10, "Expiration duration did not match");
	assertEquals(
		new Date(invite.expires ?? "0").getTime() - new Date(invite.created).getTime(),
		expiration.ms,
		"Expiration diff did not match",
	)
	assertAlmostEquals(
		new Date(invite.expires ?? "0").getTime(),
		Date.now() + expiration.ms,
		500, // Allow for up to half a second off
		"Expiration deadline was too far off of what was expected",
	);
});
