import { test, TestContext } from "@ogs/helpers/friends/test.ts";
import { assertEquals } from "std/assert/mod.ts";
import { faker } from "@faker-js/faker";

test("e2e accept", async (ctx: TestContext) => {
	const { user: userA, token: tokenA } = await ctx.call("users", "register", {
		username: faker.internet.userName(),
		identity: { guest: {} },
	});

	const { user: userB, token: tokenB } = await ctx.call("users", "register", {
		username: faker.internet.userName(),
		identity: { guest: {} },
	});

	const { friendRequest } = await ctx.call("friends", "send_request", {
		userToken: tokenA.token,
		targetUserId: userB.id,
	});

	const { friendRequests: outgoingRequests } = await ctx.call(
		"friends",
		"list_outgoing_friend_requests",
		{
			userToken: tokenA.token,
		},
	);
	assertEquals(outgoingRequests.length, 1);

	const { friendRequests: incomingRequests } = await ctx.call(
		"friends",
		"list_incoming_friend_requests",
		{
			userToken: tokenB.token,
		},
	);
	assertEquals(incomingRequests.length, 1);

	await ctx.call("friends", "accept_request", {
		userToken: tokenB.token,
		friendRequestId: friendRequest.id,
	});

	const friendsA = await ctx.call("friends", "list_friends", {
		userToken: tokenA.token,
	});
	assertEquals(friendsA.friends.length, 1);

	const friendsB = await ctx.call("friends", "list_friends", {
		userToken: tokenB.token,
	});
	assertEquals(friendsB.friends.length, 1);

	await ctx.call("friends", "remove_friend", {
		userToken: tokenA.token,
		targetUserId: userB.id,
	});

	const friendsRemoved = await ctx.call("friends", "list_friends", {
		userToken: tokenB.token,
	});
	assertEquals(friendsRemoved.friends.length, 0);
});

test("e2e reject", async (ctx: TestContext) => {
	const { user: userA, token: tokenA } = await ctx.call("users", "register", {
		username: faker.internet.userName(),
		identity: { guest: {} },
	});

	const { user: userB, token: tokenB } = await ctx.call("users", "register", {
		username: faker.internet.userName(),
		identity: { guest: {} },
	});

	const { friendRequest } = await ctx.call("friends", "send_request", {
		userToken: tokenA.token,
		targetUserId: userB.id,
	});

	await ctx.call("friends", "decline_request", {
		userToken: tokenB.token,
		friendRequestId: friendRequest.id,
	});

	const { friendRequests: outgoingRequests } = await ctx.call(
		"friends",
		"list_outgoing_friend_requests",
		{
			userToken: tokenA.token,
		},
	);
	assertEquals(outgoingRequests.length, 0);

	const { friendRequests: incomingRequests } = await ctx.call(
		"friends",
		"list_incoming_friend_requests",
		{
			userToken: tokenB.token,
		},
	);
	assertEquals(incomingRequests.length, 0);
});
