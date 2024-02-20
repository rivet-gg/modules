import { test, TestContext } from "@ogs/helpers/parties/test.ts";
import { assertExists } from "std/assert/mod.ts";
import { faker } from "@faker-js/faker";

// FIXME: 
test("parties create", async (ctx: TestContext) => {
	const { token: ownerToken } = await ctx.call(
		"users",
		"register",
		{
			username: faker.internet.userName(),
			identity: { guest: {} },
		},
	) as any;

	const friendIds: string[] = [];

	for (let i = 0; i < 3; i++) {
		const { user: friend, token: friendToken } = await ctx.call(
			"users",
			"register",
			{
				username: faker.internet.userName(),
				identity: { guest: {} },
			},
		) as any;
		friendIds.push(friend.id);

		try {
			const { friendRequest: { id: friendRequestId } } = await ctx.call(
				"friends",
				"send_request",
				{
					userToken: ownerToken.token,
					targetUserId: friend.id,
				},
			) as any;
	
			await ctx.call("friends", "accept_request", {
				userToken: friendToken.token,
				friendRequestId,
			});
		} catch (e) {
			console.error(e);
		}
	}

	const { party } = await ctx.call("parties", "create", {
		ownerToken: ownerToken.token,
		friendsOnly: true,
		otherMembers: friendIds,
	}) as any;

	assertExists(party);
});
