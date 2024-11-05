import { ScriptContext } from "../module.gen.ts";
import { BlumintMatchFinalStats } from "./types.ts";

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