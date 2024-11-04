import { RuntimeError } from "../module.gen.ts";
import { RouteContext, RouteRequest, RouteResponse } from "../module.gen.ts";
import { CreateMatchTeam } from "../scripts/create_match.ts";

export async function handle(
    ctx: RouteContext,
    req: RouteRequest
): Promise<RouteResponse> {
    // TODO: Check signing to confirm the request is from blumint
    const teams: CreateMatchTeam[] = [];
    let matchSettings: Record<string, any> = {};
    try {
        const raw = await req.json();
    
        if (!raw) throw new RuntimeError("invalid_request_body");
        const reqTeams = raw.teams;
        if (!Array.isArray(teams)) throw new RuntimeError("invalid_request_body"); 
        for (const reqTeam of reqTeams) {
            if (!Array.isArray(reqTeam.players)) throw new RuntimeError("invalid_request_body");
            const team: CreateMatchTeam = { players: [] };
            for (const reqPlayer of reqTeam.players) {
                if (typeof reqPlayer.playerId !== "string") throw new RuntimeError("invalid_request_body");
                team.players.push({
                    playerId: reqPlayer.playerId
                });
            }
            teams.push(team);
        }

        if (raw.matchSettings) {
            if (typeof raw.matchSettings !== "object") throw new RuntimeError("invalid_request_body");
            matchSettings = raw.matchSettings;
        }
    } catch {
        throw new RuntimeError("invalid_request_body")
    }

    const res = await ctx.modules.tournaments.createMatch({
        teams,
        matchSettings
    });

    return new RouteResponse(
        JSON.stringify({
            matchId: res.matchId,
            matchUrl: res.matchUrl
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            }
        }
    );
}