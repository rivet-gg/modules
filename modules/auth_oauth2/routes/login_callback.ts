import {
	RouteContext,
	RouteRequest,
	RouteResponse,
	RuntimeError,
} from "../module.gen.ts";

import { getFullConfig } from "../utils/env.ts";
import { getClient } from "../utils/client.ts";
import { getUserUniqueIdentifier } from "../utils/client.ts";
import { Tokens } from "https://deno.land/x/oauth2_client@v1.0.2/mod.ts";
import { extractTokenFromState } from "../utils/state.ts";
import { compareConstantTime } from "../utils/state.ts";

export async function handle(
	ctx: RouteContext,
	req: RouteRequest,
): Promise<RouteResponse> {
	// Max 2 login attempts per IP per minute
	// ctx.modules.rateLimit.throttlePublic({ requests: 5, period: 60 });

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

	// Extract the token from the state
	const redirectedFlowToken = await extractTokenFromState(
		config.oauthSecret,
		redirectedState,
	);
	const { tokens: [flowTokenData] } = await ctx.modules.tokens.fetchByToken({
		tokens: [redirectedFlowToken],
	});

	// Get and verify the provider, state, and code verifier from the token
	// metadata
	const { meta } = flowTokenData;
	const { provider, state, codeVerifier } = meta.oauthData as Record<
		string,
		unknown
	>;

	if (
		!provider || !state || !codeVerifier ||
		typeof provider !== "string" || typeof state !== "string" ||
		typeof codeVerifier !== "string"
	) throw new RuntimeError("missing_oauth_data", { statusCode: 400 });
	if (!compareConstantTime(state, redirectedState)) {
		throw new RuntimeError("invalid_state", { statusCode: 400 });
	}

	// Get the oauth client
	const client = getClient(config, provider);
	if (!client.config.redirectUri) {
		throw new RuntimeError("invalid_config", { statusCode: 500 });
	}

	// Get the user's tokens and sub
	let tokens: Tokens;
	let sub: string;
	try {
		tokens = await client.code.getToken(uri.toString(), {
			state,
			codeVerifier,
		});

		sub = await getUserUniqueIdentifier(
			tokens.accessToken,
			config.providers[provider],
		);
	} catch (e) {
		console.error(e);
		throw new RuntimeError("invalid_oauth_response", { statusCode: 502 });
	}

	// Update the token to include the finished details
	const newMeta = {
		...meta,
		oauth: {
			provider,
			sub,
			tokens,
		},
	};
	await ctx.modules.tokens.modifyMeta({ token: redirectedFlowToken, newMeta });

	return new RouteResponse(
		"You successfully logged in! You can now close this page.",
	);
}
