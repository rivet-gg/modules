import { Runtime, TestContext } from "@ogs/runtime";
import config from "../../../dist/runtime_config.ts";
import { assertEquals } from "std/assert/mod.ts";
import { faker } from "@faker-js/faker";

Runtime.test(config, "friends", "e2e accept", async (ctx: TestContext) => {
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

Runtime.test(config, "friends", "e2e reject", async (ctx: TestContext) => {
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
