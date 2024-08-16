import { DestroyLobbyRequest } from "../utils/lobby_manager/rpc.ts";
import { ScriptContext } from "../module.gen.ts";

export interface Request {
	lobbyId: string;
  reason?: string;
}

export interface Response {
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.actors.lobbyManager.getOrCreateAndCall<undefined, DestroyLobbyRequest, undefined>(
		"default",
		undefined,
		"rpcDestroyLobby",
		{ lobbyId: req.lobbyId, reason: req.reason }
	);

	return {};
}
