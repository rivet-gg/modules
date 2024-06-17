import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

export interface Request {
	method: string;
	path: string;
  // TODO: Change back to unknown
	body?: any;
}

export interface Response {
  // TODO: Change back to unknown
	body: any;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const serviceToken = ctx.environment.get(ctx.config.serviceTokenVariable);
	assertExists(
		serviceToken,
		`Missing environment variable: ${ctx.config.serviceTokenVariable}`,
	);

	const response = await fetch(new URL(req.path, ctx.config.apiEndpoint), {
		method: req.method,
		headers: {
			"Authorization": `Bearer ${serviceToken}`,
			"Content-Type": "application/json",
		},
		body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
	});
	if (!response.ok) {
		throw new RuntimeError("rivet_error", {
			meta: {
				status: response.status,
				text: await response.text(),
			},
		});
	}
	const body = await response.json();

	return { body };
}
