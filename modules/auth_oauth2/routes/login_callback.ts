import {
	RouteContext,
	RuntimeError,
	RouteRequest,
	RouteResponse,
} from "../module.gen.ts";

import { getCodeVerifierFromCookie, getStateFromCookie, getLoginIdFromCookie } from "../utils/trace.ts";
import { getFullConfig } from "../utils/env.ts";
import { getClient } from "../utils/client.ts";
import { getUserUniqueIdentifier } from "../utils/client.ts";
import { Tokens } from "https://deno.land/x/oauth2_client@v1.0.2/mod.ts";

export async function handle(
	ctx: RouteContext,
	req: RouteRequest,
): Promise<RouteResponse> {
	// Max 2 login attempts per IP per minute
	ctx.modules.rateLimit.throttlePublic({ requests: 5, period: 60 });

	// Ensure that the provider configurations are valid
	const config = await getFullConfig(ctx.userConfig);
	if (!config) throw new RuntimeError("invalid_config", { statusCode: 500 });

	const loginId = getLoginIdFromCookie(ctx);
	const codeVerifier = getCodeVerifierFromCookie(ctx);
	const state = getStateFromCookie(ctx);

	if (!loginId || !codeVerifier || !state) throw new RuntimeError("missing_login_data", { statusCode: 400 });


	// Get the login attempt stored in the database
	const loginAttempt = await ctx.db.oAuthLoginAttempt.findUnique({
		where: { id: loginId, completedAt: null, invalidatedAt: null },
	});

	if (!loginAttempt) throw new RuntimeError("login_not_found", { statusCode: 400 });
	if (loginAttempt.state !== state) throw new RuntimeError("invalid_state", { statusCode: 400 });
	if (loginAttempt.codeVerifier !== codeVerifier) throw new RuntimeError("invalid_code_verifier", { statusCode: 400 });

	// Get the provider config
	const provider = config.providers[loginAttempt.provider];
	if (!provider) throw new RuntimeError("invalid_provider", { statusCode: 400 });

	// Get the oauth client
	const client = getClient(config, provider.name, new URL(req.url));
	if (!client.config.redirectUri) throw new RuntimeError("invalid_config", { statusCode: 500 });


	// Get the URI that this request was made to
	const uri = new URL(req.url);
	const uriStr = uri.toString();

	// Get the user's tokens and sub
	let tokens: Tokens;
	let sub: string;
	try {
		tokens = await client.code.getToken(uriStr, { state, codeVerifier });
		sub = await getUserUniqueIdentifier(tokens.accessToken, provider);
	} catch (e) {
		console.error(e);
		throw new RuntimeError("invalid_oauth_response", { statusCode: 502 });
	}

	const expiresIn = tokens.expiresIn ?? 3600;
	const expiry = new Date(Date.now() + expiresIn);

	// Ensure the user is registered with this sub/provider combo
	const user = await ctx.db.oAuthUsers.findFirst({
		where: {
			sub,
			provider: loginAttempt.provider,
		},
	});

	let userId: string;
	if (user) {
		userId = user.userId;
	} else {
		const { user: newUser } = await ctx.modules.users.createUser({ username: sub });
		await ctx.db.oAuthUsers.create({
			data: {
				sub,
				provider: loginAttempt.provider,
				userId: newUser.id,
			},
		});

		userId = newUser.id;
	}

	// Generate a token which the user can use to authenticate with this module
	const { token } = await ctx.modules.users.createUserToken({ userId });

	// Record the credentials
	await ctx.db.oAuthCreds.create({
		data: {
			loginAttemptId: loginAttempt.id,
			provider: provider.name,
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken ?? "",
			userToken: token.token,
			expiresAt: expiry,
		},
	});


	const response = RouteResponse.redirect(loginAttempt.targetUrl, 303);

    const headers = new Headers(response.headers);

	// Clear login session cookies
	const expireAttribs = `Path=/; Max-Age=0; SameSite=Lax; Expires=${new Date(0).toUTCString()}`;
	headers.append("Set-Cookie", `login_id=EXPIRED; ${expireAttribs}`);
	headers.append("Set-Cookie", `code_verifier=EXPIRED; ${expireAttribs}`);
	headers.append("Set-Cookie", `state=EXPIRED; ${expireAttribs}`);

	// Tell the browser to never cache this page
	headers.set("Cache-Control", "no-store");

	// Set token cookie
	const cookieAttribs = `Path=/; Max-Age=${expiresIn}; SameSite=Lax; Expires=${expiry.toUTCString()}`;
	headers.append("Set-Cookie", `token=${token.token}; ${cookieAttribs}`);

	return new Response(response.body, { status: response.status, headers });
}
