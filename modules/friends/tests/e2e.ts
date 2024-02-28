import { test, TestContext } from "../_gen/test.ts";
import { assertEquals } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";

test("e2e accept", async (ctx: TestContext) => {
	const { user: userA, token: tokenA } = await ctx.call("users", "register", {
		username: faker.internet.userName(),
		identity: { guest: {} },
	}) as any;

	const { user: userB, token: tokenB } = await ctx.call("users", "register", {
		username: faker.internet.userName(),
		identity: { guest: {} },
	}) as any;

	const { friendRequest } = await ctx.call("friends", "send_request", {
		userToken: tokenA.token,
		targetUserId: userB.id,
	}) as any;

	const { friendRequests: outgoingRequests } = await ctx.call(
		"friends",
		"list_outgoing_friend_requests",
		{
			userToken: tokenA.token,
		},
	) as any;
	assertEquals(outgoingRequests.length, 1);

	const { friendRequests: incomingRequests } = await ctx.call(
		"friends",
		"list_incoming_friend_requests",
		{
			userToken: tokenB.token,
		},
	) as any;
	assertEquals(incomingRequests.length, 1);

	await ctx.call("friends", "accept_request", {
		userToken: tokenB.token,
		friendRequestId: friendRequest.id,
	}) as any;

	const friendsA = await ctx.call("friends", "list_friends", {
		userToken: tokenA.token,
	}) as any;
	assertEquals(friendsA.friends.length, 1);

	const friendsB = await ctx.call("friends", "list_friends", {
		userToken: tokenB.token,
	}) as any;
	assertEquals(friendsB.friends.length, 1);

	await ctx.call("friends", "remove_friend", {
		userToken: tokenA.token,
		targetUserId: userB.id,
	}) as any;

	const friendsRemoved = await ctx.call("friends", "list_friends", {
		userToken: tokenB.token,
	}) as any;
	assertEquals(friendsRemoved.friends.length, 0);
});

test("e2e reject", async (ctx: TestContext) => {
	const { user: userA, token: tokenA } = await ctx.call("users", "register", {
		username: faker.internet.userName(),
		identity: { guest: {} },
	}) as any;

	const { user: userB, token: tokenB } = await ctx.call("users", "register", {
		username: faker.internet.userName(),
		identity: { guest: {} },
	}) as any;

	const { friendRequest } = await ctx.call("friends", "send_request", {
		userToken: tokenA.token,
		targetUserId: userB.id,
	}) as any;

	await ctx.call("friends", "decline_request", {
		userToken: tokenB.token,
		friendRequestId: friendRequest.id,
	}) as any;

	const { friendRequests: outgoingRequests } = await ctx.call(
		"friends",
		"list_outgoing_friend_requests",
		{
			userToken: tokenA.token,
		},
	) as any;
	assertEquals(outgoingRequests.length, 0);

	const { friendRequests: incomingRequests } = await ctx.call(
		"friends",
		"list_incoming_friend_requests",
		{
			userToken: tokenB.token,
		},
	) as any;
	assertEquals(incomingRequests.length, 0);
});
