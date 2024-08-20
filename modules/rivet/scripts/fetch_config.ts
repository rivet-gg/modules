import { assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ScriptContext } from "../module.gen.ts";

export interface Request {
    
}

export interface Response {
  apiEndpoint: string,
  gameId: string,
  environmentId: string,
}

export async function run(
	ctx: ScriptContext,
	_req: Request,
): Promise<Response> {
	const apiEndpoint = ctx.environment.get(ctx.config.apiEndpointVariable) ?? ctx.config.apiEndpoint;
	const gameId = ctx.environment.get(ctx.config.gameIdVariable);
	const environmentId = ctx.environment.get(ctx.config.environmentIdVariable);

	assertExists(gameId, `Missing environment variable: ${ctx.config.gameIdVariable}`);
	assertExists(environmentId, `Missing environment variable: ${ctx.config.environmentIdVariable}`);

  return { apiEndpoint, gameId, environmentId };
}

