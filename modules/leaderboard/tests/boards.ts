import { test, TestContext, RuntimeError } from "../_gen/test.ts";
import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";

test("create and look up", async (ctx: TestContext) => {
	const leaderboardId = faker.random.alphaNumeric(10);
	const { leaderboard } = await ctx.modules.leaderboard.initBoard({
		options: {
			key: leaderboardId,
			name: faker.random.word(),
		},
	});
	assertEquals(leaderboard.key, leaderboardId);

	const { leaderboards: boards } = await ctx.modules.leaderboard.listBoards({});
	assert(boards.some(l => l.key === leaderboardId));

	const { leaderboards: filteredBoards0 } = await ctx.modules.leaderboard.listBoards({
		keyContains: leaderboardId.slice(0, 5),
	});
	assertEquals(filteredBoards0.length, 1);
	assertEquals(filteredBoards0[0].key, leaderboardId);

	const { leaderboards: filteredBoards1 } = await ctx.modules.leaderboard.listBoards({
		keyContains: "NONEXISTENT_KEY",
	});
	assertEquals(filteredBoards1.length, 0);

    // Cleanup
	await ctx.modules.leaderboard.deleteBoard({ key: leaderboardId });
});

test("delete and look up", async (ctx: TestContext) => {
	const leaderboardId = faker.random.alphaNumeric(10);
	const { leaderboard } = await ctx.modules.leaderboard.initBoard({
		options: {
			key: leaderboardId,
			name: faker.random.word(),
		},
	});
	assertEquals(leaderboard.key, leaderboardId);

    await ctx.modules.leaderboard.deleteBoard({ key: leaderboardId });

    const { leaderboards: boards } = await ctx.modules.leaderboard.listBoards({
        keyContains: leaderboardId,
    });
    assertEquals(boards.length, 0);

    const doubleDeleteError = await assertRejects(async () => {
        await ctx.modules.leaderboard.deleteBoard({ key: leaderboardId });
    }, RuntimeError);
    assertEquals(doubleDeleteError.code, "leaderboard_not_found");
});

test("lock and unlock", async (ctx: TestContext) => {
    const leaderboardId = faker.random.alphaNumeric(10);
    const { leaderboard } = await ctx.modules.leaderboard.initBoard({
        options: {
            key: leaderboardId,
            name: faker.random.word(),
        },
    });
    assertEquals(leaderboard.key, leaderboardId);

    const { leaderboard: afterLock } = await ctx.modules.leaderboard.lockBoard({ key: leaderboardId });
    assertEquals(afterLock.locked, true);

    const { leaderboard: afterUnlock } = await ctx.modules.leaderboard.unlockBoard({ key: leaderboardId });
    assertEquals(afterUnlock.locked, false);

    // Cleanup
	await ctx.modules.leaderboard.deleteBoard({ key: leaderboardId });
});

