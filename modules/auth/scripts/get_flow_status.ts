import { ScriptContext } from "../module.gen.ts";
import { FlowStatus, getFlowStatus } from "../utils/flow.ts";

export interface Request {
	flowToken: string;
}
export interface Response {
	status: FlowStatus;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	return {
		status: await getFlowStatus(ctx, req.flowToken),
	};
}
