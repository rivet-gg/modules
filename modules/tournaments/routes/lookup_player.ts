import { RuntimeError } from "../module.gen.ts";
import { RouteContext, RouteRequest, RouteResponse } from "../module.gen.ts";
import { PLAYER_SOCIALS, PlayerAssociations } from "../utils/types.ts";

export async function handle(
    ctx: RouteContext,
    req: RouteRequest
): Promise<RouteResponse> {
    const assocs: PlayerAssociations = {};
    try {
        const raw = await req.json();
        if (!raw) throw new RuntimeError("invalid_request_body");
        for (const social of PLAYER_SOCIALS) {
            const ids = raw[social];
            if (!ids) continue;
            if (!Array.isArray(ids)) throw new RuntimeError("invalid_request_body");
            assocs[social] = [];
            for (const id of ids) {
                if (typeof id !== "string") throw new RuntimeError("invalid_request_body");
                assocs[social].push(id);
            }
        }
    } catch {
        throw new RuntimeError("invalid_request_body")
    }

    const res = await ctx.modules.tournaments.lookupPlayer(assocs);

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