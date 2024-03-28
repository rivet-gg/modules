import { test, TestContext, RuntimeError } from "../_gen/test.ts";
import { assertEquals, assertGreater, assertRejects } from "https://deno.land/std@0.220.0/assert/mod.ts";

test("read before and after expire", async (ctx: TestContext) => {
	const gameId = crypto.randomUUID();
	const identityId = crypto.randomUUID();

	const initialMessage = "Hello!";

	await ctx.modules.presence.set({
		gameId,
		identityId,
		message: initialMessage,
		mutualMeta: {},
		publicMeta: {},
        expiresInMs: 200, // 0.2 second life
	});

	const { presence: readPresence } = await ctx.modules.presence.get({
		gameId,
		identityId,
	});

	assertEquals(readPresence.gameId, gameId);
	assertEquals(readPresence.identityId, identityId);

    // Wait for 0.5 seconds to guarantee the presence has expried
    await new Promise(res => setTimeout(res, 500));

    const err = await assertRejects(() => (
        ctx.modules.presence.get({
            gameId,
            identityId,
        })
    ), RuntimeError);

    assertEquals(err.code, "presence_not_found");
});

test("extend expiration", async (ctx: TestContext) => {
	const gameId = crypto.randomUUID();
	const identityId = crypto.randomUUID();

	const initialMessage = "Hello!";

	await ctx.modules.presence.set({
		gameId,
		identityId,
		message: initialMessage,
		mutualMeta: {},
		publicMeta: {},
        expiresInMs: 200, // 0.2 second life
	});

	const { presence: readPresence } = await ctx.modules.presence.get({
		gameId,
		identityId,
	});

	assertEquals(readPresence.gameId, gameId);
	assertEquals(readPresence.identityId, identityId);

    await ctx.modules.presence.extend({
        gameId,
        identityId,
        expiresInMs: 10000, // 10 seconds
        reviveIfExpired: false,
    });

    // Wait for 0.5 seconds to guarantee the presence would have expired without
    // extension.
    await new Promise(res => setTimeout(res, 500));

	const { presence: readExtendedPresence } = await ctx.modules.presence.get({
		gameId,
		identityId,
	});

    // Check that only the `expiresInMs` is different
    assertGreater(
        readExtendedPresence.expiresInMs,
        readPresence.expiresInMs,
    );
    assertEquals({
        ...readExtendedPresence,
        expiresInMs: undefined,
        updatedAt: undefined,
    }, {
        ...readPresence,
        expiresInMs: undefined,
        updatedAt: undefined,
    });
});
