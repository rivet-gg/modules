import { RouteContext, ScriptContext } from "../module.gen.ts";

export interface LobbyReference {
    token?: string;
    id?: string;
}

// TODO: Maybe make this a lobbies script
async function getLobbyIdFromToken(ctx: ScriptContext | RouteContext, lobbyToken: string) {
    const { token } = await ctx.modules.tokens.validate({
        token: lobbyToken,
    });
    return token.meta.lobbyId;
}

export async function getMatchIdFromLobby(
    ctx: ScriptContext | RouteContext,
    lobby: LobbyReference
) {
    if (!lobby.token && !lobby.id) {
        throw new Error("Invalid lobby reference");
    }
    const lobbyId = lobby.id || await getLobbyIdFromToken(ctx, lobby.token!);
    return await ctx.db.query.blumintMatches.findFirst({
        where: {
            lobbyId,
        },
    });
}