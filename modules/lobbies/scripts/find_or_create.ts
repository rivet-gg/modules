import {
	FindOrCreateLobbyRequest,
	FindOrCreateLobbyResponse,
} from "../utils/lobby_manager/rpc.ts";
import { ScriptContext } from "../module.gen.ts";
import { LobbyResponse } from "../utils/lobby/mod.ts";
import {
	buildPlayerResponseWithToken,
	PlayerRequest,
	PlayerResponseWithToken,
} from "../utils/player.ts";

export interface Request {
	version: string;
  regions?: string[];
	tags?: Record<string, string>;
	players: PlayerRequest[];
  noWait?: boolean;

	createConfig: {
    region: string;
		tags?: Record<string, string>;
		maxPlayers: number;
		maxPlayersDirect: number;
	};
}

export interface Response {
	lobby: LobbyResponse;
	players: PlayerResponseWithToken[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const lobbyId = crypto.randomUUID();

	const { lobby, players } = await ctx.actors
		.lobbyManager.getOrCreateAndCall<undefined, FindOrCreateLobbyRequest, FindOrCreateLobbyResponse>(
			"default",
			undefined,
			"rpcFindOrCreateLobby",
			{
				query: {
					version: req.version,
          regions: req.regions,
					tags: req.tags,
				},
				lobby: {
					lobbyId,
					version: req.version,
          region: req.createConfig.region,
					tags: req.createConfig.tags,
					maxPlayers: req.createConfig.maxPlayers,
					maxPlayersDirect: req.createConfig.maxPlayersDirect,
				},
				players: req.players,
        noWait: req.noWait ?? false,
			}
		);

	const playerResponses = [];
	for (const player of players) {
		playerResponses.push(await buildPlayerResponseWithToken(ctx, player));
	}

	return {
		lobby,
		players: playerResponses,
	};
}
