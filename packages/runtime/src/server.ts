import { LogEntry } from "./logger.ts";
import { Context, ContextParams, ModuleContextParams, Route, Script } from "./mod.ts";
import { Runtime } from "./runtime.ts";
import { PathResolver } from "../../path_resolver/src/mod.ts";
import { badBodyResponse, notFoundResponse, serverOrRuntimeError } from "./responses.ts";

const MODULE_CALL = /^\/modules\/(?<module>\w+)\/scripts\/(?<script>\w+)\/call\/?$/;

interface RequestInfo {
	remoteAddress: string;
}

export async function handleRequest<Params extends ModuleContextParams>(
	runtime: Runtime<Params>,
	req: Request,
	info: RequestInfo,
	resolver: PathResolver,
): Promise<Response> {
	const url = new URL(req.url);

	// Create context
	const ctx = runtime.createRootContext({
		httpRequest: {
			method: req.method,
			path: url.pathname,
			remoteAddress: info.remoteAddress,
			headers: Object.fromEntries(req.headers.entries()),
		},
	});

	// Log request
	const start = performance.now();
	ctx.log.debug(
		"http request",
		["method", req.method],
		["path", url.pathname],
		["remoteAddress", info.remoteAddress],
		["userAgent", req.headers.get("user-agent")],
	);

	// Execute request
	const res = await handleRequestInner(runtime, req, url, ctx, resolver);

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
	ctx: Context<Params>,
	resolver: PathResolver,
): Promise<Response> {
	// MARK: Handle CORS

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

	// MARK: Handle Scripts
	const matches = MODULE_CALL.exec(url.pathname);
	if (matches?.groups) {
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

		// Lookup script
		const moduleName = matches.groups.module!;
		const scriptName = matches.groups.script!;
		const script = runtime.config.modules[moduleName]?.scripts[scriptName];
		if (!script) return notFoundResponse(ctx, url.pathname);

		return handleScriptCall(req, url, ctx, moduleName, scriptName, script);
	}

	// MARK: Handle Routes
	// Route call
	const resolved = resolver.resolve(url.pathname);
	if (!resolved) return notFoundResponse(ctx, url.pathname);

	const { module, route } = resolved;

	const routeObj = runtime.config.modules[module]?.routes?.[route];
	if (!routeObj) return notFoundResponse(ctx, url.pathname);

	return handleRouteCall(runtime, req, url, ctx, module, route, routeObj);
}

export async function handleScriptCall<Params extends ContextParams>(
	req: Request,
	url: URL,
	ctx: Context<Params>,
	moduleName: string,
	scriptName: string,
	script: Script,
) {
	// If a script is not public, return 404
	if (!script.public) return notFoundResponse(ctx, url.pathname);

	// Parse body
	let body: any;
	try {
		body = await req.json();
	} catch {
		return badBodyResponse(ctx, "invalid JSON");
	}

	let output: any;
	try {
		// Call module
		output = await ctx.call(
			moduleName as any,
			scriptName as any,
			body,
		);
	} catch (error) {
		return serverOrRuntimeError(ctx, error);
	}

	return new Response(
		JSON.stringify(output),
		{
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		},
	);
}

export async function handleRouteCall<Params extends ContextParams>(
	runtime: Runtime<Params>,
	req: Request,
	url: URL,
	ctx: Context<Params>,
	moduleName: string,
	routeName: string,
	route: Route,
) {
	if (!route.methods.has(req.method)) notFoundResponse(ctx, url.pathname);

	const routeCtx = runtime.createRouteContext(ctx, moduleName, routeName);

	// Call route
	const res = await ctx.runBlock(async () => await route.run(routeCtx, req));
	console.log(
		`Route Response ${moduleName}.${routeName}:\n${JSON.stringify(res, null, 2)}`,
	);

	return res;
}
