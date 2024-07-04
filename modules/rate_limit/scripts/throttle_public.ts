import { ScriptContext } from "../module.gen.ts";

export interface Request {
	/**
	 * Number of requests in `period` before rate limiting.
	 * @default 20
	 */
	requests?: number;

	/**
	 * How frequently to reset the request counter.
	 * @default 300
	 */
	period?: number;
}

export type Response = Record<string, never>;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// Find the IP address of the client
	let key: string | undefined;
	for (const entry of ctx.trace.entries) {
		if ("httpRequest" in entry.type) {
			key = entry.type.httpRequest.remoteAddress;
			break;
		}
	}

  // If no IP address, this request is not coming from a client and should not
  // be throttled
	if (!key) {
		return {};
	}

	await ctx.modules.rateLimit.throttle({
		type: "ip",
		key,
		requests: req.requests ?? 20,
		period: req.period ?? 300,
	});

	return {};
}
