import { loginAttempts } from "../db/schema.ts";
import { RuntimeError, ScriptContext, UnreachableError, Empty } from "../module.gen.ts";
import { getClient } from "../utils/client.ts";
import { getFullConfig } from "../utils/env.ts";
import { dataToStateStr } from "../utils/state.ts";

const FLOW_LIFE_SECS = 60 * 30; // 30 minutes
function getExpiry(): Date {
    const expiresAt = Date.now() + FLOW_LIFE_SECS * 1000;
    return new Date(expiresAt);
}

export interface BaseReq {
    provider: string;
}

export type SignInDetails = { createUser: boolean };
export type SignUpDetails = Empty;
export type ConnectDetails = { userToken: string };

export type SignInRequest = BaseReq & { signIn: SignInDetails };
export type SignUpRequest = BaseReq & { signUp: SignUpDetails };
export type ConnectRequest = BaseReq & { connect: ConnectDetails };

// export type Request = BaseReq & (SignInRequest | SignUpRequest |
// ConnectRequest);

// export type Request = {
//     provider: string;
// } & (SignInRequest | SignUpRequest | ConnectRequest);

export type Request = any;

export interface Response {
    authUrl: string;
    flowToken: string;
}

export async function run(
	ctx: ScriptContext,
	_req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

    const req = _req as SignInRequest | SignUpRequest | ConnectRequest;

    const actionData = {
        link: null as null | string,
        signIn: false,
        signUp: false,
    }

	if ("connect" in req) {
		const { userId } = await ctx.modules.users.authenticateToken({ userToken: req.connect.userToken });
        actionData.link = userId;
	} else if ("signIn" in req) {
        actionData.signIn = true;
        actionData.signUp = req.signIn.createUser;
	} else if ("signUp" in req) {
        actionData.signUp = true;
    } else {
		throw new UnreachableError(req);
	}

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
    await ctx.db.insert(loginAttempts).values({
        id: flowId,
        providerId: req.provider,
        expiresAt: expiry,
        codeVerifier,
        state,
        actionData,
    });

    return {
        authUrl: uri.toString(),
        flowToken,
    };
}
