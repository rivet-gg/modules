import { test, TestContext } from "../module.gen.ts";
import { assertEquals } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";

test("e2e accept", async (ctx: TestContext) => {
	const { user: userA } = await ctx.modules.users.create({
		username: faker.internet.userName(),
	});
	const { token: tokenA } = await ctx.modules.users.createToken({ userId: userA.id });

	const { user: userB } = await ctx.modules.users.create({
		username: faker.internet.userName(),
	});
	const { token: tokenB } = await ctx.modules.users.createToken({ userId: userB.id });

	const { friendRequest } = await ctx.modules.friends.sendRequest({
		userToken: tokenA.token,
		targetUserId: userB.id,
	});

	const { friendRequests: outgoingRequests } = await ctx.modules.friends
		.listOutgoingFriendRequests({
			userToken: tokenA.token,
		});
	assertEquals(outgoingRequests.length, 1);

	const { friendRequests: incomingRequests } = await ctx.modules.friends
		.listIncomingFriendRequests({
			userToken: tokenB.token,
		});
	assertEquals(incomingRequests.length, 1);

	await ctx.modules.friends.acceptRequest({
		userToken: tokenB.token,
		friendRequestId: friendRequest.id,
	});

	const friendsA = await ctx.modules.friends.listFriends({
		userToken: tokenA.token,
	});
	assertEquals(friendsA.friends.length, 1);

	const friendsB = await ctx.modules.friends.listFriends({
		userToken: tokenB.token,
	});
	assertEquals(friendsB.friends.length, 1);

	await ctx.modules.friends.removeFriend({
		userToken: tokenA.token,
		targetUserId: userB.id,
	});

	const friendsRemoved = await ctx.modules.friends.listFriends({
		userToken: tokenB.token,
	});
	assertEquals(friendsRemoved.friends.length, 0);
});

test("e2e reject", async (ctx: TestContext) => {
	const { user: userA } = await ctx.modules.users.create({
		username: faker.internet.userName(),
	});
	const { token: tokenA } = await ctx.modules.users.createToken({ userId: userA.id });

	const { user: userB } = await ctx.modules.users.create({
		username: faker.internet.userName(),
	});
	const { token: tokenB } = await ctx.modules.users.createToken({ userId: userB.id });

	const { friendRequest } = await ctx.modules.friends.sendRequest({
		userToken: tokenA.token,
		targetUserId: userB.id,
	});

	await ctx.modules.friends.declineRequest({
		userToken: tokenB.token,
		friendRequestId: friendRequest.id,
	});

	const { friendRequests: outgoingRequests } = await ctx.modules.friends
		.listOutgoingFriendRequests({
			userToken: tokenA.token,
		});
	assertEquals(outgoingRequests.length, 0);

	const { friendRequests: incomingRequests } = await ctx.modules.friends
		.listIncomingFriendRequests({
			userToken: tokenB.token,
		});
	assertEquals(incomingRequests.length, 0);
});
