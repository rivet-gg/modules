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
import {
	getCaptchaProvider,
	getRateLimitConfigByEndpoint,
} from "../utils/captcha_config.ts";

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
	const rateLimitConfig = getRateLimitConfigByEndpoint(ctx.config, "join");
	const captchaProvider = getCaptchaProvider(ctx.config);
	if (captchaProvider !== null) {
		await ctx.modules.captcha.guard({
			key: "default",
			period: rateLimitConfig.period,
			requests: rateLimitConfig.requests,
			type: "lobbies.join",
			captchaToken: req.captchaToken,
			captchaProvider: captchaProvider,
		});
	}

	const { lobby, players } = await ctx.actors
		.lobbyManager.getOrCreateAndCall<
		undefined,
		JoinLobbyRequest,
		JoinLobbyResponse
	>(
		"default",
		undefined,
		"rpcJoinLobby",
		{
			lobbyId: req.lobbyId,
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
