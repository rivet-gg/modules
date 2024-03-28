import { test, TestContext, RuntimeError } from "../_gen/test.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "https://deno.land/std@0.220.0/assert/mod.ts";

test("create and read", async (ctx: TestContext) => {
	const gameId = crypto.randomUUID();
	const identityId = crypto.randomUUID();

	const initialMessage = "Hello!";

	const { presence: createdPresence } = await ctx.modules.presence.set({
		gameId,
		identityId,
		message: initialMessage,
		mutualMeta: {},
		publicMeta: {},
	});

	assertEquals(createdPresence.gameId, gameId);
	assertEquals(createdPresence.identityId, identityId);
	assertEquals(createdPresence.message, initialMessage);

	const { presence: readPresence } = await ctx.modules.presence.get({
		gameId,
		identityId,
	});

	assertEquals(readPresence.gameId, gameId);
	assertEquals(readPresence.identityId, identityId);

	assertEquals(createdPresence, readPresence);
});

test("create and list", async (ctx: TestContext) => {
	const gameIds = Array.from({ length: 3 }, () => crypto.randomUUID());
	const identityIds = Array.from({ length: 3 }, () => crypto.randomUUID());

	const fmtMessage = (gameId: string, identityId: string) => `I'm a presence for game ${gameId} and identity ${identityId}`;

	const pairs: Set<string> = new Set();

	for (const gameId of gameIds) {
		for (const identityId of identityIds) {
			if (Math.random() > 0.5) {
				await ctx.modules.presence.set({
					gameId,
					identityId,
					message: fmtMessage(gameId, identityId),
					mutualMeta: {},
					publicMeta: {},
				});
				pairs.add(`${gameId}:${identityId}`);
			}
		}
	}


	for (const gameId of gameIds) {
		const { presences } = await ctx.modules.presence.getByGame({
			gameId,
		});

		const actualPairs = new Set(presences.map((p) => `${p.gameId}:${p.identityId}`));
		const gameSet = new Set([...pairs].filter((pair) => pair.startsWith(gameId)));
		assertEquals(actualPairs, gameSet);

		for (const presence of presences) {
			assertEquals(presence.message, fmtMessage(presence.gameId, presence.identityId));
		}
	}

	for (const identityId of identityIds) {
		const { presences } = await ctx.modules.presence.getByIdentity({
			identityId,
		});

		const actualPairs = new Set(presences.map((p) => `${p.gameId}:${p.identityId}`));
		const identitySet = new Set([...pairs].filter((pair) => pair.endsWith(identityId)));
		assertEquals(actualPairs, identitySet);

		for (const presence of presences) {
			assertEquals(presence.message, fmtMessage(presence.gameId, presence.identityId));
		}
	}

	const clears = await Promise.all(
		gameIds.map((gameId) => ctx.modules.presence.clearAllGame({ gameId })),
	);

	const clearedPairs = clears.map(({ cleared }, i) => ({ count: cleared, gameId: gameIds[i] }));

	for (const { count, gameId } of clearedPairs) {
		const gameSet = new Set([...pairs].filter((pair) => pair.startsWith(gameId)));
		assertEquals(count, gameSet.size);
	}
});

test("create and clear", async (ctx: TestContext) => {
	const gameId = crypto.randomUUID();
	const identityId = crypto.randomUUID();

	const initialMessage = "Hello!";

	// Create
	const { presence: createdPresence } = await ctx.modules.presence.set({
		gameId,
		identityId,
		message: initialMessage,
		mutualMeta: {},
		publicMeta: {},
	});

	assertEquals(createdPresence.gameId, gameId);
	assertEquals(createdPresence.identityId, identityId);
	assertEquals(createdPresence.message, initialMessage);

	// Clear
	await ctx.modules.presence.clear({
		gameId,
		identityId,
	});

	// Get after clear
	const err = await assertRejects(() => (
		ctx.modules.presence.get({
			gameId,
			identityId,
		})
	), RuntimeError);

	assertEquals(err.code, "presence_not_found");
	assertStringIncludes(String(err.cause), identityId);
	assertStringIncludes(String(err.cause), gameId);
});
