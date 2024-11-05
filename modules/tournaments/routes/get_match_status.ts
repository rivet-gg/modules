import { RuntimeError } from "../module.gen.ts";
import { RouteContext, RouteRequest, RouteResponse } from "../module.gen.ts";
import { CreateMatchTeam } from "../scripts/create_match.ts";

export async function handle(
    ctx: RouteContext,
    req: RouteRequest
): Promise<RouteResponse> {
    // TODO: Check signing to confirm the request is from blumint
    let matchId: string;
    try {
        const raw = await req.json();
    
        if (!raw) throw new RuntimeError("invalid_request_body");
        matchId = raw.matchId;
        if (typeof matchId !== "string") throw new RuntimeError("invalid_request_body");
    } catch {
        throw new RuntimeError("invalid_request_body")
    }
    // TODO: Make sure its 
    const res = await ctx.modules.tournaments.getMatchStatus({
        matchId
    });

    return new RouteResponse(
        JSON.stringify(res),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        }
    );
}