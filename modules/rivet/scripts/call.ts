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
	const apiEndpoint = ctx.environment.get(ctx.config.apiEndpointVariable) ?? ctx.config.apiEndpoint;
	const serviceToken = ctx.environment.get(ctx.config.serviceTokenVariable);
	assertExists(
		serviceToken,
		`Missing environment variable: ${ctx.config.serviceTokenVariable}`,
	);

    ctx.log.info(
      "rivet request",
      ["method", req.method],
      ["path", new URL(req.path, apiEndpoint).toString()],
      ["token", `Bearer ${serviceToken}`]
    );
	const response = await fetch(new URL(req.path, apiEndpoint), {
		method: req.method,
		headers: {
			"Authorization": `Bearer ${serviceToken}`,
			"Content-Type": "application/json",
		},
		body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
	});
	if (!response.ok) {
    ctx.log.warn(
      "rivet request error",
      ["method", req.method],
      ["path", req.path],
      ["status", response.status],
      ["body", await response.text()],
    );
		throw new RuntimeError("rivet_api_error", {
			meta: {
        method: req.method,
        path: req.path,
				status: response.status,
			},
		});
	}
	const body = await response.json();

	return { body };
}
