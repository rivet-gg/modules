import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { getLobbyConfig } from "../utils/lobby_config.ts";
import { getSortedRegionsByProximity, Region, regionsForBackend } from "../utils/region.ts";
import { getRequestGeoCoords } from "../utils/rivet/geo_coord.ts";

export interface Request {
  tags?: Record<string, string>,
}

export interface Response {
    regions: Region[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
  const lobbyConfig = getLobbyConfig(ctx.config, req.tags ?? {});

  const coords = getRequestGeoCoords(ctx);
  const regions = regionsForBackend(lobbyConfig.backend);
  if (!coords) {
    return { regions };
  }
  
  return {
    regions: getSortedRegionsByProximity(regions, coords)
  }
}

