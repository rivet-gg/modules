import { ScriptContext, Query, RuntimeError } from "../module.gen.ts";
import { invalidate } from "../utils/migrate.ts";

export interface Request {
	token: string;
}

export interface Response {
	data: unknown;
}

export async function run(ctx: ScriptContext, req: Request): Promise<Response> {
	try {
		const { data } = await invalidate(ctx, req.token);
		
		return { data };
	} catch (e) {
		if (e instanceof RuntimeError) {
			throw e;
		} else if (e instanceof Query.DrizzleError) {
			throw new RuntimeError("failed_to_update");
		} else {
			throw new RuntimeError("unknown_err");
		}
	}
}
