import { ScriptContext } from "@ogs/helpers/rate_limit/throttle.ts";

export interface Request {
	/**
	 * The preset to use for rate limiting.
	 */
	preset?: string;

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

export interface Response {
}

export async function handler(
	_ctx: ScriptContext,
	_req: Request,
): Promise<Response> {
	// TODO:

	return {};
}
