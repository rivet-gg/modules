import {
	CreateLobbyRequest,
	CreateLobbyResponse,
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
  	region: string;
	tags?: Record<string, string>;
	maxPlayers: number;
	maxPlayersDirect: number;

	players: PlayerRequest[];

	noWait?: boolean;

	captchaToken?: string;
}

export interface Response {
	lobby: LobbyResponse;
	players: PlayerResponseWithToken[];
}

// TODO: Doc why we create tokens on the script and not the DO

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.captcha.guard({
		key: "lobbies.create",
		period: 15,
		requests: 5,
		type: "default",
		captchaToken: req.captchaToken,
		captchaProvider: getCaptchaProvider(ctx.config)
	});

	const lobbyId = crypto.randomUUID();

	const { lobby, players } = await ctx.actors.lobbyManager
		.getOrCreateAndCall<undefined, CreateLobbyRequest, CreateLobbyResponse>(
			"default",
			undefined,
			"rpcCreateLobby",
			{
				lobby: {
					lobbyId,
					version: req.version,
          region: req.region,
					tags: req.tags,
					maxPlayers: req.maxPlayers,
					maxPlayersDirect: req.maxPlayersDirect,
				},
				players: req.players,
				noWait: req.noWait ?? false,
			},
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
