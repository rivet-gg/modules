import { assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ThrottleRequest, ThrottleResponse } from "../actors/limiter.ts";
import { RuntimeError, ScriptContext } from "../module.gen.ts";

export interface Request {
	/**
	 * The type of entity to rate limit by. For example, "ip" or "user".
	 */
	type: string;

	/**
	 * The key to rate limit by. For example, the IP address or user ID.
	 */
	key: string;

	/**
	 * Number of requests in `period` before rate limiting.
	 */
	requests: number;

	/**
	 * How frequently to reset the request counter, in seconds.
	 */
	period: number;
}

export type Response = Record<string, never>;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
  assert(req.requests > 0);
  assert(req.period > 0);

  // Create key
  const key = `${JSON.stringify(req.type)}.${JSON.stringify(req.key)}`;

  // Throttle request
  const res = await ctx.actors.limiter.getOrCreateAndCall<undefined, ThrottleRequest, ThrottleResponse>(key, undefined, "throttle", {
    requests: req.requests,
    period: req.period,
  });

  // Check if allowed
	if (!res.success) {
		throw new RuntimeError("RATE_LIMIT_EXCEEDED", {
			meta: {
				retryAfter: new Date(res.refillAt).toUTCString(),
			},
		});
	}

	return {};
}
