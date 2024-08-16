import { ScriptContext } from "../module.gen.ts";

export interface Request {
    
}

export interface Response {
    state: any;
}

export async function run(
	ctx: ScriptContext,
	_req: Request,
): Promise<Response> {
	const state = await ctx.actors
		.lobbyManager.getOrCreateAndCall(
			"default",
			undefined,
			"rpcReadState",
      {}
		);
  return { state };
}

