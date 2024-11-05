import { BlumintMatchFinalStats } from "./types.ts";

const BLUMINT_API_BASE = "https://www.blumint.com/api";

export async function sendFinalStatsToBlumint(matchStats: BlumintMatchFinalStats) {
    console.log("Sending final stats to Blumint " + Deno.inspect(matchStats));
    // await fetch(`${BLUMINT_API_BASE}/tournaments/match/submit`, {
    //     method: "POST",
    //     body: JSON.stringify(matchStats)
    // });
}