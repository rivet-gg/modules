import { Empty, RuntimeError, ScriptContext } from "../module.gen.ts";
import { createFlowToken } from "../utils/flow.ts";
import { initFlowWithProvider } from "../utils/providers.ts";
import { Provider } from "../utils/types.ts";

export interface Request {
	provider: Provider;
}
export interface Response {
	urlForLoginLink: string;
	token: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const token = await createFlowToken(ctx, req.provider);
	const url = await initFlowWithProvider(ctx, token.token, req.provider);

	return { token: token.token, urlForLoginLink: url };
}
