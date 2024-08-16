import { SetLobbyReadyRequest } from "../utils/lobby_manager/rpc.ts";
import { RuntimeError, ScriptContext } from "../module.gen.ts";

export interface Request {
  lobbyId?: string;
  lobbyToken?: string;
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

	await ctx.actors.lobbyManager.getOrCreateAndCall<
		undefined,
		SetLobbyReadyRequest,
		undefined
	>(
		"default",
		undefined,
		"rpcSetLobbyReady",
		{ lobbyId, hasLobbyToken },
	);

	return {};
}
