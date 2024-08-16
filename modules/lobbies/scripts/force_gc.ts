import { ScriptContext } from "../module.gen.ts";

export interface Request {
}

export interface Response {
}

export async function run(
	ctx: ScriptContext,
	_req: Request,
): Promise<Response> {
	await ctx.actors.lobbyManager.getOrCreateAndCall(
		"default",
		undefined,
		"gc",
		undefined,
	);

	return {};
}
