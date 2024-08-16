import { SetPlayersConnectedRequest } from "../utils/lobby_manager/rpc.ts";
import { RuntimeError, ScriptContext, UnreachableError } from "../module.gen.ts";

export interface Request {
  lobbyId?: string;
  lobbyToken?: string;
  playerTokens: string[];
}

export interface Response {
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
  let lobbyId: string;
  let hasLobbyToken: boolean;
  if (req.lobbyToken) {
    const { token } = await ctx.modules.tokens.validate({
      token: req.lobbyToken,
    });
    lobbyId = token.meta.lobbyId;
    hasLobbyToken = true;
  } else if (req.lobbyId) {
    lobbyId = req.lobbyId;
    hasLobbyToken = false;
  } else {
    throw new RuntimeError("lobby_token_required");
  }

	const playerIds: string[] = [];
	for (const playerToken of req.playerTokens) {
		const { token } = await ctx.modules.tokens.validate({ token: playerToken });
		playerIds.push(token.meta.playerId);
	}

	await ctx.actors.lobbyManager.getOrCreateAndCall<
		undefined,
		SetPlayersConnectedRequest,
		undefined
	>(
		"default",
		undefined,
		"rpcSetPlayersConnected",
		{ lobbyId, hasLobbyToken, playerIds },
	);

	return {};
}
