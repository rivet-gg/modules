import { ScriptContext } from "../../module.gen.ts";
import { RegionGeoCoords, EMPTY_GEO_COORDS } from "../region.ts";

type TraceEntry = ScriptContext["trace"]["entries"][0];
type TraceEntryTypeHttpRequest = Extract<TraceEntry["type"], { httpRequest: any }>["httpRequest"];
export const getRequestGeoCoords = (
    ctx: ScriptContext
): RegionGeoCoords => {
    // If they aren't real servers, we're probably not in managed
    // So we just return
    if (!("server" in ctx.config.lobbies.backend)) return EMPTY_GEO_COORDS;

    // Check if env flag is set for managed
    // TODO(Nathan): Set this flag to 1 for managed
    if (ctx.environment.get("MANAGED") !== "1") return EMPTY_GEO_COORDS;

    // TODO: Only check the first/last entry
    let httpReq: TraceEntryTypeHttpRequest | null = null; 
    for (const entry of ctx.trace.entries) {
		if ("httpRequest" in entry.type) {
			httpReq = entry.type.httpRequest;
			break;
		}
	}

    if (!httpReq) return EMPTY_GEO_COORDS;

    // TODO(Nathan):
    // Add header to worker
    if (!httpReq.headers["x-backend-client-coords"]) return EMPTY_GEO_COORDS;

    // TODO: Optimize this
    // Even add some checks for nan and infinities to be extra safe
    const coords = httpReq.headers["x-backend-client-coords"].split(",").map(e => parseFloat(e.trim()));
    if (coords.length !== 2) return EMPTY_GEO_COORDS;

    return {
        latitude: coords[0]!,
        longitude: coords[1]!
    }
}