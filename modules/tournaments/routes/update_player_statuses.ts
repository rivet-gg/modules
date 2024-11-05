import { RuntimeError } from "../module.gen.ts";
import { RouteContext, RouteRequest, RouteResponse } from "../module.gen.ts";
import { PlayerAndStatus } from "../scripts/update_player_statuses.ts";
import { getMatchIdFromLobby, LobbyReference } from "../utils/common.ts";
import { BlumintMatchTeamPlayerStatus } from "../utils/types.ts";

export async function handle(
    ctx: RouteContext,
    req: RouteRequest
): Promise<RouteResponse> {
    await ctx.modules.rateLimit.throttlePublic({ requests: 5, period: 60 });

    const lobbyInfo: LobbyReference = {}

    const playerUpdates: PlayerAndStatus[] = []
    try {
        const raw = await req.json();
        if (!raw) throw new RuntimeError("invalid_request_body");
        const reqLobby = raw.lobby;
        if (!reqLobby) throw new RuntimeError("invalid_request_body");
        const token = reqLobby.token;
        const id = reqLobby.id;
        if (typeof token === "string") lobbyInfo.token = token;
        else if (typeof id === "string") lobbyInfo.id = id;
        else throw new RuntimeError("invalid_request_body");

        if (!Array.isArray(raw.playerUpdates)) throw new RuntimeError("invalid_request_body");
        for (const update of raw.playerUpdates) {
            if (typeof update.playerId !== "string") throw new RuntimeError("invalid_request_body");
            if (typeof update.status !== "string") throw new RuntimeError("invalid_request_body");
            playerUpdates.push({
                playerId: update.playerId,
                // We don't check & enforce the type to BlumintMatchTeamPlayerStatus,
                // since the internal script will do the check for us
                status: update.status as BlumintMatchTeamPlayerStatus
            });
        }
    } catch {
        throw new RuntimeError("invalid_request_body")
    }
    
    if (!lobbyInfo.token && !lobbyInfo.id) {
        throw new RuntimeError("invalid_request_body");
    }

    const matchId = await getMatchIdFromLobby(ctx, lobbyInfo);
    ctx.log.info(`Updating player statuses for match ${Deno.inspect({ matchId, playerUpdates })}`);
    await ctx.modules.tournaments.updatePlayerStatuses({
        matchId,
        playerUpdates
    });

    return new RouteResponse(
        "{}",
        {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        }
    );
}