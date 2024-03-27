import { test, TestContext, RuntimeError } from "../_gen/test.ts";
import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";

test("top5", async (ctx: TestContext) => {
	const leaderboardId = faker.random.alphaNumeric(10);
	const { leaderboard } = await ctx.modules.leaderboard.initBoard({
		options: {
			key: leaderboardId,
			name: faker.random.word(),
		},
	});
	assertEquals(leaderboard.key, leaderboardId);
	
	const names = Array.from({ length: 10 }, () => crypto.randomUUID());
	const entries = names.map(name => ({
		ownerId: name,
		score: Math.floor(Math.random() * 100),
	}));
	for (const entry of entries) {
		await ctx.modules.leaderboard.set({
			key: leaderboardId,
			...entry,
		});
	}

	const sortedEntries = entries.toSorted((a, b) => a.score - b.score).toReversed();
	const { entries: topEntries } = await ctx.modules.leaderboard.getRange({
		key: leaderboardId,
		range: [0, 5],
		sortType: "desc",
	});
	assertEquals(topEntries.length, 5);

	const matches = topEntries.every((entry, i) => {
		const expected = sortedEntries[i];
		return entry.ownerId === expected.ownerId && entry.score === expected.score;
	});
	assert(matches);

	// Cleanup
	await ctx.modules.leaderboard.deleteBoard({ key: leaderboardId });
});

test("for specific owner", async (ctx: TestContext) => {
	const leaderboardId = faker.random.alphaNumeric(10);
	const { leaderboard } = await ctx.modules.leaderboard.initBoard({
		options: {
			key: leaderboardId,
			name: faker.random.word(),
		},
	});
	assertEquals(leaderboard.key, leaderboardId);
	
	// Initialize 10 random entries in the DB
	const names = Array.from({ length: 10 }, () => crypto.randomUUID());
	const entries = names.map(name => ({
		ownerId: name,
		score: Math.floor(Math.random() * 100),
	}));
	for (const entry of entries) {
		await ctx.modules.leaderboard.set({
			key: leaderboardId,
			...entry,
		});
	}

	// Check for entry that exists
	const entry = entries[Math.floor(Math.random() * entries.length)];

	const { entry: foundEntry } = await ctx.modules.leaderboard.getEntry({
		key: leaderboardId,
		ownerId: entry.ownerId,
		sortType: "desc",
	});
	assertEquals(foundEntry.ownerId, entry.ownerId);
	assertEquals(foundEntry.score, entry.score);


	// Check for entry that doesn't exist
	const nonExistentOwnerId = crypto.randomUUID();

	const nonExistentEntryError = await assertRejects(async () => {
		await ctx.modules.leaderboard.getEntry({
			key: leaderboardId,
			ownerId: nonExistentOwnerId,
			sortType: "desc",
		});
	}, RuntimeError);
	assertEquals(nonExistentEntryError.code, "entry_not_found");


	// Cleanup
	await ctx.modules.leaderboard.deleteBoard({ key: leaderboardId });
});
