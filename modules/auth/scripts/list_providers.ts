import { Empty, ScriptContext } from "../module.gen.ts";
import { Provider } from "../utils/types.ts";

export type Request = Empty;
export interface Response {
	providers: Provider[];
}

// deno-lint-ignore require-await
export async function run(
	ctx: ScriptContext,
	_: Request,
): Promise<Response> {
	return { providers: ctx.config.providers };
}
