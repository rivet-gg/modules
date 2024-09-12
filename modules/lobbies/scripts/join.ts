import {
	JoinLobbyRequest,
	JoinLobbyResponse,
} from "../utils/lobby_manager/rpc.ts";
import { ScriptContext } from "../module.gen.ts";
import { LobbyResponse } from "../utils/lobby/mod.ts";
import {
	buildPlayerResponseWithToken,
	PlayerRequest,
	PlayerResponseWithToken,
} from "../utils/player.ts";
import { getCaptchaProvider } from "../utils/captcha_config.ts";

export interface Request {
	lobbyId: string;
	players: PlayerRequest[];
  	noWait?: boolean;

	captchaToken?: string;
}

export interface Response {
	lobby: LobbyResponse;
	players: PlayerResponseWithToken[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.captcha.guard({
		key: "lobbies.join",
		period: 15,
		requests: 8,
		type: "default",
		captchaToken: req.captchaToken,
		captchaProvider: getCaptchaProvider(ctx.config)
	});

	const { lobby, players } = await ctx.actors
		.lobbyManager.getOrCreateAndCall<undefined, JoinLobbyRequest, JoinLobbyResponse>(
			"default",
			undefined,
			"rpcJoinLobby",
			{
				lobbyId: req.lobbyId,
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
