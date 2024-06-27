import { ScriptContext } from "../module.gen.ts";
import { completeFlow } from "../utils/flow.ts";

export interface Request {
	flowToken: string;
	userId: string;
}
export interface Response {
	userToken: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	return {
		userToken: await completeFlow(ctx, req.flowToken, req.userId),
	};
}
