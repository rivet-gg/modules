import { BlumintMatchFinalStats } from "./types.ts";

const BLUMINT_API_BASE = "https://www.blumint.com/api";

export async function sendFinalStatsToBlumint(matchStats: BlumintMatchFinalStats) {
    await fetch(`${BLUMINT_API_BASE}/tournaments/match/submit`, {
        method: "POST",
        body: JSON.stringify(matchStats)
    });
}