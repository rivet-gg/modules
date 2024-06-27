import { Empty, RuntimeError, ScriptContext } from "../module.gen.ts";
import { Provider } from "../utils/types.ts";

export interface Request {
	provider: Provider;
}
export interface Response {
	urlForLoginLink: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	throw new RuntimeError("todo", { statusCode: 500 });
}
