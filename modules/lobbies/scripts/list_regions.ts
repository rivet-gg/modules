import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { getLobbyConfig } from "../utils/lobby_config.ts";
import { Region, regionsForBackend } from "../utils/region.ts";

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

  const regions = regionsForBackend(lobbyConfig.backend)

  return { regions };
}

