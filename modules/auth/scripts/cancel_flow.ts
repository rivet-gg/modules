import { Empty, ScriptContext } from "../module.gen.ts";
import { cancelFlow } from "../utils/flow.ts";

export interface Request {
	flowToken: string;
}
export type Response = Empty;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await cancelFlow(ctx, req.flowToken);
	return {};
}
