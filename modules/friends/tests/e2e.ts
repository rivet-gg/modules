import { Runtime, Context } from "@ogs/runtime";
import config from "../../../dist/runtime_config.ts";
import { assertEquals, assertExists } from "std/assert/mod.ts";
import { faker } from "@faker-js/faker";

Runtime.test(config, "friends", "e2e accept", async (ctx: Context) => {
    let { user: userA, token: tokenA } = await ctx.call("users", "register", {
        username: faker.internet.userName(),
        identity: { guest: {} },
    }) as any;

    let { user: userB, token: tokenB } = await ctx.call("users", "register", {
        username: faker.internet.userName(),
        identity: { guest: {} },
    }) as any;

    let { friendRequest } = await ctx.call("friends", "send_request", {
        userToken: tokenA.token,
        targetUserId: userB.id,
    }) as any;

    await ctx.call("friends", "accept_request", {
        userToken: tokenB.token,
        friendRequestId: friendRequest.id,
    }) as any;

    let friendsA = await ctx.call("friends", "list_friends", {
        userToken: tokenA.token
    }) as any;
    assertEquals(friendsA.friends.length, 1);

    let friendsB = await ctx.call("friends", "list_friends", {
        userToken: tokenB.token
    }) as any;
    assertEquals(friendsB.friends.length, 1);
});

Runtime.test(config, "friends", "e2e reject", async (ctx: Context) => {
    let { user: userA, token: tokenA } = await ctx.call("users", "register", {
        username: faker.internet.userName(),
        identity: { guest: {} },
    }) as any;

    let { user: userB, token: tokenB } = await ctx.call("users", "register", {
        username: faker.internet.userName(),
        identity: { guest: {} },
    }) as any;

    let { friendRequest } = await ctx.call("friends", "send_request", {
        userToken: tokenA.token,
        targetUserId: userB.id,
    }) as any;

    await ctx.call("friends", "decline_request", {
        userToken: tokenB.token,
        friendRequestId: friendRequest.id,
    }) as any;
});
