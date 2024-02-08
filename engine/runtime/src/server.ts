import { Runtime } from "./runtime.ts";

export function serverHandler(runtime: Runtime): Deno.ServeHandler {
    return async (req: Request): Response => {
        const url = new URL(req.url);
        console.log('url', url.pathname)

        const moduleCall = /^\/modules\/(\w+)\/scripts\/(\w+)\/call\/?$/;
        if (req.method == "POST" && moduleCall.test(url.pathname)) {
            const matches = url.pathname.match(moduleCall);
            if (matches) {
                // Match module
                const [, moduleName, scriptName] = matches;
                let output = await runtime.call(moduleName, scriptName, await req.json());
                return new Response(JSON.stringify(output), { status: 200, headers: { "Content-Type": "application/json" } });
            }
        }

        return new Response("welp", { status: 404 });
    };
}

