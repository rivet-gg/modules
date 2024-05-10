import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { getClient } from "../utils/client.ts";
import { getFullConfig } from "../utils/env.ts";
import { dataToStateStr } from "../utils/state.ts";

const FLOW_LIFE_SECS = 60 * 30; // 30 minutes
function getExpiry(): Date {
    const expiresAt = Date.now() + FLOW_LIFE_SECS * 1000;
    return new Date(expiresAt);
}

export interface Request {
    provider: string;
}

export interface Response {
    authUrl: string;
    flowToken: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

    // Ensure that the provider configurations are valid
    const config = await getFullConfig(ctx.config);
    if (!config) throw new RuntimeError("invalid_config", { statusCode: 500 });
    
	// Get the OAuth2 Client
	const client = getClient(config, req.provider);

    // Create a flow token to authenticate the login attempt
    const flowId = crypto.randomUUID();
    const expiry = getExpiry();
    const { token: { token: flowToken } } = await ctx.modules.tokens.create({
        type: "auth_oauth2_flow",
        expireAt: expiry.toISOString(),
        meta: {
            flowId,
        }
    });

    // Generate a random state string
	const state = await dataToStateStr(
        config.oauthSecret,
        JSON.stringify({ flowId, providerId: req.provider }),
    );

	// Get the URI to eventually redirect the user to
	const { uri, codeVerifier } = await client.code.getAuthorizationUri({ state });

    // Record the details of the login attempt
    await ctx.db.loginAttempts.create({
        data: {
            id: flowId,
            providerId: req.provider,
            expiresAt: expiry.toISOString(),
            codeVerifier,
            state,
        }
    });

    return {
        authUrl: uri.toString(),
        flowToken,
    };
}
