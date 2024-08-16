import { CreateLobbyRequest, CreateLobbyResponse } from "../actors/lobby_manager.ts";
import { RuntimeError, test, TestContext } from "../module.gen.ts";
import {
	assertArrayIncludes,
	assertEquals,
	assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

const VERSION = "TODO";

test("e2e", async (ctx: TestContext) => {
	// MARK: Create lobby
	const { lobby, players } = await ctx.modules.lobbies.create({
		version: VERSION,
		tags: {},
		players: [{}, {}],
		maxPlayers: 8,
		maxPlayersDirect: 8,
		noWait: true,
	});
  const { lobbyToken } = await setLobbyReady(ctx, lobby.id);

	// MARK: List lobbies
	{
		const { lobbies } = await ctx.modules.lobbies.list({});
		assertEquals(lobbies.length, 1);
		assertEquals(lobbies[0]!.id, lobby.id);
	}

	// MARK: Connect players
	await ctx.modules.lobbies.setPlayerConnected({
		lobbyToken,
		playerTokens: [players[0]!.token, players[1]!.token],
	});

	// MARK: Disconnect players
	await ctx.modules.lobbies.setPlayerDisconnected({
		lobbyToken,
		playerTokens: [players[0]!.token, players[1]!.token],
	});

	// MARK: Create players
	{
		const { players: players2 } = await ctx.modules.lobbies.join({
			lobbyId: lobby.id,
			players: [{}],
		});
		await ctx.modules.lobbies.setPlayerConnected({
			lobbyToken,
			playerTokens: [players2[0]!.token],
		});
		await ctx.modules.lobbies.setPlayerDisconnected({
			lobbyToken,
			playerTokens: [players2[0]!.token],
		});
	}

	// MARK: Destroy lobby
	await ctx.modules.lobbies.destroy({
		lobbyId: lobby.id,
	});

	{
		const { lobbies } = await ctx.modules.lobbies.list({});
		assertEquals(lobbies.length, 0);
	}

	const error = await assertRejects(async () => {
		await ctx.modules.lobbies.destroy({ lobbyId: lobby.id });
	}, RuntimeError);
	assertEquals(error.code, "lobby_not_found");
});

test("lobby tags", async (ctx: TestContext) => {
	// MARK: Create lobbies
	const { lobby: lobby1 } = await ctx.modules.lobbies.create(
		{
			version: VERSION,
			tags: { gameMode: "a", region: "atl" },
			players: [{}],
			maxPlayers: 8,
			maxPlayersDirect: 8,
			noWait: true,
		},
	);
  await setLobbyReady(ctx, lobby1.id);
	const { lobby: lobby2 } = await ctx.modules.lobbies.create(
		{
			version: VERSION,
			tags: { gameMode: "a", region: "fra" },
			players: [{}],
			maxPlayers: 8,
			maxPlayersDirect: 8,
			noWait: true,
		},
	);
  await setLobbyReady(ctx, lobby2.id);
	const { lobby: lobby3 } = await ctx.modules.lobbies.create(
		{
			version: VERSION,
			tags: { gameMode: "b", region: "fra" },
			players: [{}],
			maxPlayers: 8,
			maxPlayersDirect: 8,
			noWait: true,
		},
	);
  await setLobbyReady(ctx, lobby3.id);

	// MARK: Find lobbies
	const { lobby: lobby4 } = await ctx.modules.lobbies.find({
		version: VERSION,
		tags: { gameMode: "a" },
		players: [{}],
	});
	assertArrayIncludes([lobby1.id, lobby2.id], [lobby4.id]);

	const { lobby: lobby5 } = await ctx.modules.lobbies.find({
		version: VERSION,
		tags: { gameMode: "b" },
		players: [{}],
	});
	assertEquals(lobby5.id, lobby3.id);

	const { lobby: lobby6 } = await ctx.modules.lobbies.find({
		version: VERSION,
		tags: { gameMode: "a", region: "fra" },
		players: [{}],
	});
	assertEquals(lobby6.id, lobby2.id);
});

test("sort order", async (_ctx: TestContext) => {
	// TODO:
});

test("lobby size", async (_ctx: TestContext) => {
	// TODO:
});

test("max players per ip", async (_ctx: TestContext) => {
	// TODO:
});

test("max players per ip with unconnected players", async (_ctx: TestContext) => {
	// TODO:
});

test("max unconnected players", async (_ctx: TestContext) => {
	// TODO:
});

test("player unconnected expire", async (_ctx: TestContext) => {
	// TODO:
});

test("old player expire", async (_ctx: TestContext) => {
});

test("lobby unready expire", async (_ctx: TestContext) => {
	// TODO:
});

test("empty lobby expire", async (_ctx: TestContext) => {
	// TODO:
});

async function issueLobbyToken(ctx: TestContext, lobbyId: string): Promise<string> {
	// Issue another token for the lobby for tests
	const { token: { token: lobbyToken } } = await ctx.modules.tokens.create({
		type: "lobby_test",
		meta: { lobbyId },
	});

  return lobbyToken;
}

async function setLobbyReady(ctx: TestContext, lobbyId: string): Promise<{ lobbyToken: string }> {
  const lobbyToken = await issueLobbyToken(ctx, lobbyId);
	await ctx.modules.lobbies.setLobbyReady({ lobbyToken });
  return { lobbyToken };
}
