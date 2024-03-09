import { RuntimeError, ScriptContext } from "../_gen/scripts/read_config.ts";

export interface Request {
}

export interface Response {
	config: {
		foo: string;
		bar: number;
	};
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	return {
		config: ctx.userConfig,
	};
}
