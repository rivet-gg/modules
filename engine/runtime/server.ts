import { Runtime } from "./runtime.ts";

export function serverHandler(runtime: Runtime): Deno.ServeHandler {
	return async (req: Request): Promise<Response> => {
		const url = new URL(req.url);
		console.log("url", url.pathname);

		const moduleCall = /^\/modules\/(\w+)\/scripts\/(\w+)\/call\/?$/;
		if (req.method == "POST" && moduleCall.test(url.pathname)) {
			const matches = url.pathname.match(moduleCall);
			if (matches) {
				// Create context
				const ctx = runtime.createRootContext({
					httpRequest: { method: req.method, path: url.pathname },
				});

				// Match module
				const [, moduleName, scriptName] = matches;
				const output = await ctx.call(
					moduleName,
					scriptName,
					await req.json(),
				);

				return new Response(JSON.stringify(output), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
		}

		return new Response("welp", { status: 404 });
	};
}
