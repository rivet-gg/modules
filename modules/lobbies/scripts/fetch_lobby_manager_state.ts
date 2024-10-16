import { ScriptContext } from "../module.gen.ts";
import { adminGuard } from "../utils/admin.ts";

export interface Request {
	adminToken: string;
}

export interface Response {
	state: any;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	adminGuard(ctx, req.adminToken);
	const state = await ctx.actors
		.lobbyManager.getOrCreateAndCall(
			"default",
			undefined,
			"rpcReadState",
			{},
		);
	return { state };
}
