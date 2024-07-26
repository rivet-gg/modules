import { errorToLogEntries } from "./logger.ts";
import { Context, INTERNAL_ERROR_CODE, INTERNAL_ERROR_DESCRIPTION, RuntimeError } from "./mod.ts";

/**
 * Builds a response indicating that the route was not found.
 *
 * Essentially a 404.
 *
 * This is used both in route calls and script calls.
 *
 * @returns A response indicating that the route was not found at the requested
 * URL.
 */
export function notFoundResponse<Ctx extends Context<any>>(ctx: Ctx, path: string): Response {
	ctx.log.error(
		"path not found",
		["path", path],
	);
	return new Response(
		JSON.stringify({
			message: "Route not found. Make sure the URL and method are correct.",
		}),
		{
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
			status: 404,
		},
	);
}

/**
 * Builds a response indicating that although the route was found, the request
 * body (JSON) was invalid or did not validate.
 *
 * Used only in script calls.
 *
 * @returns A response indicating that the request body was invalid for the
 * script called.
 */
export function badBodyResponse<Ctx extends Context<any>>(ctx: Ctx, issue?: string): Response {
	if (issue) {
		ctx.log.error(
			"request body error",
			["issue", issue ?? "bad body"],
		);
	} else {
		ctx.log.error("bad body");
	}

	const reason = issue || "Not JSON, invalid format, or bad data";
	return new Response(
		JSON.stringify({
			message: `Request has an invalid body. (${reason})`,
		}),
		{
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
			status: 400,
		},
	);
}

/**
 * Builds a response from an unknown `e`, handling both the case where `e` is a
 * {@linkcode RuntimeError} and the case where it is not.
 *
 * @param e The (maybe {@linkcode RuntimeError}) error to be converted into a
 * response
 * @returns A response indicating that an unknown error occurred in the server
 * OR that a {@linkcode RuntimeError} occurred.
 */
export function serverOrRuntimeError<Ctx extends Context<any>>(ctx: Ctx, e: unknown): Response {
	const status = e instanceof RuntimeError ? e.statusCode : 500;
	let output: unknown;
	if (e instanceof RuntimeError) {
		ctx.log.error(
			"caught error",
			...errorToLogEntries("error", e),
		);

		// Never return error details to the client in order to prevent reverse
		// engineering & accidentally leaking secrets.
		if (e.internal) {
			output = {
				code: INTERNAL_ERROR_CODE,
				message: INTERNAL_ERROR_DESCRIPTION,
			};
		} else {
			output = {
				code: e.code,
				message: e.message,
				module: e.moduleName,
				meta: e.meta,
			};
		}
	} else {
		ctx.log.error("unknown error", ["error", JSON.stringify(e)]);
		output = {
			code: INTERNAL_ERROR_CODE,
			message: INTERNAL_ERROR_DESCRIPTION,
		};
	}
	return new Response(
		JSON.stringify(output),
		{
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
			status,
		},
	);
}
