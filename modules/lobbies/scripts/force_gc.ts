import { ScriptContext } from "../module.gen.ts";
import { adminGuard } from "../utils/admin.ts";

export interface Request {
	adminToken: string;
}

export interface Response {
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	adminGuard(ctx, req.adminToken);
	await ctx.actors.lobbyManager.getOrCreateAndCall(
		"default",
		undefined,
		"gc",
		undefined,
	);

	return {};
}
