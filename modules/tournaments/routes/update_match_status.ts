import { RuntimeError } from "../module.gen.ts";
import { RouteContext, RouteRequest, RouteResponse } from "../module.gen.ts";
import { getMatchIdFromLobby, LobbyReference } from "../utils/common.ts";
import { BlumintMatchStatus } from "../utils/types.ts";

export async function handle(
    ctx: RouteContext,
    req: RouteRequest
): Promise<RouteResponse> {
    await ctx.modules.rateLimit.throttlePublic({ requests: 5, period: 60 });

    const lobbyInfo: LobbyReference = {}

    // We don't check & enforce the type to BlumintMatchStatus,
    // since the internal script will do the check for us
    let status: string;

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

        if (typeof raw.status === "string") status = raw.status;
        else throw new RuntimeError("invalid_request_body");
    } catch {
        throw new RuntimeError("invalid_request_body")
    }
    
    if (!lobbyInfo.token && !lobbyInfo.id) {
        throw new RuntimeError("invalid_request_body");
    }

    const matchId = await getMatchIdFromLobby(ctx, lobbyInfo);

    await ctx.modules.tournaments.updateMatchStatus({
        matchId,
        status: status as BlumintMatchStatus
    });

    return new RouteResponse(
        null,
        {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
}