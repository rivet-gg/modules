import {
	RouteContext,
	RuntimeError,
	RouteRequest,
	RouteResponse,
} from "../module.gen.ts";

import { getFullConfig } from "../utils/env.ts";
import { getClient } from "../utils/client.ts";
import { getUserUniqueIdentifier } from "../utils/client.ts";
import { Tokens } from "https://deno.land/x/oauth2_client@v1.0.2/mod.ts";

import { compareConstantTime, stateToDataStr } from "../utils/state.ts";
import { OAUTH_DONE_HTML } from "../utils/pages.ts";

export async function handle(
	ctx: RouteContext,
	req: RouteRequest,
): Promise<RouteResponse> {
	// Max 5 login attempts per IP per minute
	ctx.modules.rateLimit.throttlePublic({ requests: 5, period: 60 });

	// Ensure that the provider configurations are valid
	const config = await getFullConfig(ctx.config);
	if (!config) throw new RuntimeError("invalid_config", { statusCode: 500 });

	// Get the URI that this request was made to
	const uri = new URL(req.url);

	// Get the state from the URI
	const redirectedState = uri.searchParams.get("state");
	if (!redirectedState) {
		throw new RuntimeError("missing_state", { statusCode: 400 });
	}

	// Extract the data from the state
	const stateData = await stateToDataStr(config.oauthSecret, redirectedState);
	const { flowId, providerId } = JSON.parse(stateData);

	// Get the login attempt stored in the database
	const loginAttempt = await ctx.db.loginAttempts.findUnique({
		where: {
			id: flowId,
		},
	});
	if (!loginAttempt) throw new RuntimeError("login_not_found", { statusCode: 400 });

	// Check if the login attempt is valid
	if (loginAttempt.completedAt) {
		throw new RuntimeError("login_already_completed", { statusCode: 400 });
	}
	if (loginAttempt.invalidatedAt) {
		throw new RuntimeError("login_cancelled", { statusCode: 400 });
	}
	if (new Date(loginAttempt.expiresAt) < new Date()) {
		throw new RuntimeError("login_expired", { statusCode: 400 });
	}

	// Check if the provider ID and state match
	const providerIdMatch = compareConstantTime(loginAttempt.providerId, providerId);
	const stateMatch = compareConstantTime(loginAttempt.state, redirectedState);
	if (!providerIdMatch || !stateMatch) throw new RuntimeError("invalid_state", { statusCode: 400 });

	const { state, codeVerifier } = loginAttempt;

	// Get the provider config
	const provider = config.providers[providerId];
	if (!provider) throw new RuntimeError("invalid_provider", { statusCode: 400 });

	// Get the oauth client
	const client = getClient(config, provider.name);
	if (!client.config.redirectUri) throw new RuntimeError("invalid_config", { statusCode: 500 });

	// Get the user's tokens and sub
	let tokens: Tokens;
	let ident: string;
	try {
		tokens = await client.code.getToken(uri.toString(), { state, codeVerifier });
		ident = await getUserUniqueIdentifier(tokens.accessToken, provider);
	} catch (e) {
		console.error(e);
		throw new RuntimeError("invalid_oauth_response", { statusCode: 502 });
	}

	// Update the login attempt
	await ctx.db.loginAttempts.update({
		where: {
			id: flowId,
		},
		data: {
			identifier: ident,
			completedAt: new Date(),
		},
	});

	return new RouteResponse(
		OAUTH_DONE_HTML,
		{
			status: 200,
			headers: {
				"Content-Type": "text/html",
			},
		},
	);
}
