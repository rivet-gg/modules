import { UserProvider } from "../config.ts";
import { ScriptContext } from "../module.gen.ts";
import { BlumintMatchFinalStats, PlayerAssociations, PlayerPossibleIds } from "./types.ts";

const BLUMINT_API_BASE = "https://www.blumint.com/api";

export async function sendFinalStatsToBlumint(
    ctx: ScriptContext,
    matchStats: BlumintMatchFinalStats
) {
    if ("prod" in ctx.config.environment) {
        // await fetch(`${BLUMINT_API_BASE}/tournaments/match/submit`, {
        //     method: "POST",
        //     body: JSON.stringify(matchStats)
        // });
    } else if ("test" in ctx.config.environment) {
        ctx.log.debug("Sending final stats to Blumint " + Deno.inspect(matchStats));
    }
}

function emptyPlayerLookupResponse(
    playerAssociations: PlayerAssociations
): PlayerPossibleIds {
    return Object.fromEntries(
        Object.entries(playerAssociations).map(([k, v]) => [k, []])
    );
}
export async function lookupPlayer(
    ctx: ScriptContext,
    playerAssociations: PlayerAssociations
): Promise<PlayerPossibleIds> {
    if ("external" in ctx.config.userProvider) {
        const endpoint = ctx.config.userProvider.external.userLookupEndpoint;
        // Throw error if its not a valid URL
        const url = new URL(endpoint);

        // TODO: Authenticate with the provider
        const possibleIds: PlayerPossibleIds = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify(playerAssociations)
        }).then(r => r.json()).catch(error => {
            ctx.log.error("Failed `lookupPlayer` call to " + url.href, ["error", error]);
            return emptyPlayerLookupResponse(playerAssociations);
        });
        
        return possibleIds;
    } else if ("test" in ctx.config.userProvider) {
        return emptyPlayerLookupResponse(playerAssociations);
    } else {
        throw new Error("Unexpected config.userProvider");
    }
}