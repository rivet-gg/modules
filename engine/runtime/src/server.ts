import { Runtime } from "./runtime.ts";

export function serverHandler(runtime: Runtime): Deno.ServeHandler {
    return async (request: Request): Response => {
        let userAgent = request.headers.get("user-agent") ?? "Unknown";
        const body = `Your user-agent is:\n\n${userAgent}`;

        return new Response(body, { status: 200 });
    };
}

