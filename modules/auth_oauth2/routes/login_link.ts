import {
	RouteContext,
	RuntimeError,
	RouteRequest,
	RouteResponse,
} from "../module.gen.ts";

import { getFullConfig } from "../utils/env.ts";
import { getClient } from "../utils/client.ts";
import { generateStateStr } from "../utils/state.ts";

// Maybe make different exported functions— `GET`, `POST`, etc?
export async function handle(
	ctx: RouteContext,
	req: RouteRequest,
): Promise<RouteResponse> {
	// Max 5 login attempts per IP per minute
	ctx.modules.rateLimit.throttlePublic({ requests: 5, period: 60 });

	// Get the data from the RouteRequest query parameters
	const url = new URL(req.url);
	const provider = url.pathname.split("/").pop();
	if (!provider) throw new RuntimeError(
		"invalid_req",
		{
			statusCode: 400,
			meta: {
				err: "missing provider at end of URL",
				path: url.pathname,
				params: Object.fromEntries(url.searchParams.entries()),
			},
		},
	);

	const targetUrl = url.searchParams.get("targetUrl");
	if (!targetUrl) throw new RuntimeError(
		"invalid_req",
		{
			statusCode: 400,
			meta: {
				err: "missing targetUrl",
				path: url.pathname,
				params: Object.fromEntries(url.searchParams.entries()),
			},
		},
	);

    console.log({ provider, targetUrl });

	// Ensure that the provider configurations are valid
	const providers = await getFullConfig(ctx.userConfig);
	if (!providers) throw new RuntimeError("invalid_config", { statusCode: 500 });

	// Get the OAuth2 Client and generate a unique state string
	const client = getClient(providers, provider, url);
	const state = generateStateStr();

	// Get the URI to eventually redirect the user to
	const { uri, codeVerifier } = await client.code.getAuthorizationUri({ state });

	// Create a login attempt to allow the module to later retrieve the login
	// information
	const { id: loginId } = await ctx.db.oAuthLoginAttempt.create({
		data: {
			provider,
			targetUrl,
			state,
			codeVerifier,
		},
	});


	// Build the response
	const response = RouteResponse.redirect(
		uri.toString(),
		303,
	);

	const headers = new Headers(response.headers);

	// Set login session cookies
	const cookieOptions = `Path=/; SameSite=Lax; Max-Age=300; Expires=${new Date(Date.now() + 300 * 1000).toUTCString()}`;
	headers.append("Set-Cookie", `login_id=${encodeURIComponent(loginId)}; ${cookieOptions}`);
	headers.append("Set-Cookie", `code_verifier=${encodeURIComponent(codeVerifier)}; ${cookieOptions}`);
	headers.append("Set-Cookie", `state=${encodeURIComponent(state)}; ${cookieOptions}`);

	// Tell the browser to never cache this page
	headers.set("Cache-Control", "no-store");

	return new Response(response.body, { status: response.status, headers });
}
