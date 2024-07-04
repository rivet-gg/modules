import { RuntimeError } from "./error.ts";
import { LogEntry, errorToLogEntries } from "./logger.ts";
import { Context, ModuleContextParams } from "./mod.ts";
import { Runtime } from "./runtime.ts";

const MODULE_CALL = /^\/modules\/(?<module>\w+)\/scripts\/(?<script>\w+)\/call\/?$/;

interface RequestInfo {
	remoteAddress: string;
}

export async function handleRequest<Params extends ModuleContextParams>(
	runtime: Runtime<Params>,
	req: Request,
	info: RequestInfo,
): Promise<Response> {
	const url = new URL(req.url);

	// Create context
	const ctx = runtime.createRootContext({
		httpRequest: {
			method: req.method,
			path: url.pathname,
			remoteAddress: info.remoteAddress,
		},
	});

  // Log request
  const start = performance.now();
  ctx.log.debug(
    "http request",
    ["method", req.method],
    ["path", url.pathname],
    ["remoteAddress", info.remoteAddress],
    ["userAgent", req.headers.get('user-agent')],
  );

  // Execute request
  const res = await handleRequestInner(runtime, req, url, ctx)

  // Log response
  //
  // `duration` will be 0 on Cloudflare Workers if there are no async actions
  // performed inside of the request:
  // https://developers.cloudflare.com/workers/runtime-apis/performance/
  const duration = Math.ceil(performance.now() - start);
  ctx.log.debug(
    "http response",
    ["status", res.status],
    ...(duration > 0 ? [["duration", `${duration}ms`] as LogEntry] : []),
  );

  return res;
}

async function handleRequestInner<Params extends ModuleContextParams>(
	runtime: Runtime<Params>,
	req: Request,
  url: URL,
  ctx: Context<Params>
): Promise<Response> {

	// Handle CORS preflight
	if (req.method === "OPTIONS") {
		return runtime.corsPreflight(req);
	}

	// Disallow even simple requests if CORS is not allowed
	if (!runtime.corsAllowed(req)) {
		return new Response(undefined, {
			status: 403,
			headers: {
				"Vary": "Origin",
				...runtime.corsHeaders(req),
			},
		});
	}

	// Only allow POST requests
	if (req.method !== "POST") {
		return new Response(undefined, {
			status: 405,
			headers: {
				"Allow": "POST",
				...runtime.corsHeaders(req),
			},
		});
	}

	// Get module and script name
	const matches = MODULE_CALL.exec(url.pathname);
	if (!matches?.groups) {
		return new Response(
			JSON.stringify({
				"message": "Route not found. Make sure the URL and method are correct.",
			}),
			{
				headers: {
					"Content-Type": "application/json",
					...runtime.corsHeaders(req),
				},
				status: 404,
			},
		);
	}

	// Lookup script
	const moduleName = matches.groups.module;
	const scriptName = matches.groups.script;
	const script = runtime.config.modules[moduleName]?.scripts[scriptName];

	// Confirm script exists and is public
	if (!script || !script.public) {
		return new Response(
			JSON.stringify({
				"message": "Route not found. Make sure the URL and method are correct.",
			}),
			{
				headers: {
					"Content-Type": "application/json",
					...runtime.corsHeaders(req),
				},
				status: 404,
			},
		);
	}

	// Parse body
	let body: any;
	try {
		body = await req.json();
	} catch {
		const output = {
			message: "Request must have a valid JSON body.",
		};
		return new Response(JSON.stringify(output), {
			status: 400,
			headers: {
				"Content-Type": "application/json",
				...runtime.corsHeaders(req),
			},
		});
	}

	try {
		// Call module
		const output = await ctx.call(
			moduleName as any,
			scriptName as any,
			body,
		);

		if (output.__tempPleaseSeeOGBE3_NoData) {
			return new Response(undefined, {
				status: 204,
				headers: {
					...runtime.corsHeaders(req),
				},
			});
		}

		return new Response(JSON.stringify(output), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				...runtime.corsHeaders(req),
			},
		});
	} catch (error) {
		// Error response
		let output;
		if (error instanceof RuntimeError) {
			ctx.log.error(
				"runtime error",
				...errorToLogEntries("error", error),
			);
			output = {
				message: error.message,
			};
		} else {
			ctx.log.error("internal error", ["error", error]);
			output = {
				message: "Internal error. More details have been printed in the logs.",
			};
		}

		return new Response(JSON.stringify(output), {
			status: 500,
			headers: {
				"Content-Type": "application/json",
				...runtime.corsHeaders(req),
			},
		});
	}
}
