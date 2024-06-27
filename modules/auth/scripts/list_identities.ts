import { Empty, RuntimeError, ScriptContext } from "../module.gen.ts";

export type Request = Empty;
export type Response = Empty;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	throw new RuntimeError("todo", { statusCode: 500 });
}
