import { ScriptContext } from "../../module.gen.ts";
import { RegionGeoCoords } from "../region.ts";

export function getRequestGeoCoords(
	ctx: ScriptContext,
): RegionGeoCoords | undefined {
	// If they aren't real servers, we're probably not in managed
	// So we just return
	if (!("server" in ctx.config.lobbies.backend)) {
		return undefined;
	}

	if (
		ctx.environment.get("RIVET_BACKEND_RUNTIME") !==
			"cloudflare_workers_platforms"
	) {
		return undefined;
	}

	const topLevelTrace = ctx.trace.entries[0];
	if (!topLevelTrace || !("httpRequest" in topLevelTrace.type)) {
		return undefined;
	}

	const httpReq = topLevelTrace.type.httpRequest;
	if (!httpReq) {
		return undefined;
	}

	if (!httpReq.headers["x-backend-client-coords"]) {
		throw new Error("Missing x-backend-client-coords header");
	}

	const [latitudeStr, longitudeStr] = httpReq.headers["x-backend-client-coords"]
		.split(",") as [string, string];

	const longitude = parseFloat(longitudeStr.trim());
	const latitude = parseFloat(latitudeStr.trim());

	if (!isFinite(longitude) || !isFinite(latitude)) {
		throw new Error("Invalid x-backend-client-coords header (non-finite)");
	}

	return {
		latitude,
		longitude,
	};
}
