import { loginAttempts } from "../db/schema.ts";
import { Query, RuntimeError, ScriptContext } from "../module.gen.ts";

export interface Request {
    flowToken: string;
}

export interface Response {
	userToken?: string;
}

async function trySignIn(ctx: ScriptContext, providerId: string, identifier: string): Promise<string | null> {
	// Try signing in with the email, and return the user token if successful.
	try {

        const signInResponse = await ctx.modules.identities.signIn({
            info: {
                identityType: "oauth2",
                identityId: providerId,
            },
            uniqueData: {
                identifier: identifier,
            },
        });

		return signInResponse.userToken;
	} catch (e) {
		if (e instanceof RuntimeError && e.code === "identity_provider_not_found") {
			// Email is not associated with an account, we can proceed with signing up.
			return null;
		} else {
			throw e;
		}
	}
}

async function trySignUp(ctx: ScriptContext, providerId: string, identifier: string, tokenData: any): Promise<string> {
	// Sign up the user with the passwordless email identity
	const signUpResponse = await ctx.modules.identities.signUp({
        info: {
            identityType: "oauth2",
            identityId: providerId,
        },
        uniqueData: {
            identifier: identifier,
        },
        additionalData: tokenData,
	});

	return signUpResponse.userToken;
}

async function tryConnect(ctx: ScriptContext, userId: string, providerId: string, identifier: string, tokenData: any): Promise<void> {
	// Sign up the user with the passwordless email identity
	await ctx.modules.identities.link({
        userToken: (await ctx.modules.users.createToken({ userId })).token.token,
        info: {
            identityType: "oauth2",
            identityId: providerId,
        },
        uniqueData: {
            identifier: identifier,
        },
        additionalData: tokenData,
	});
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

    if (!req.flowToken) throw new RuntimeError("missing_token", { statusCode: 400 });

    const { tokens: [flowToken] } = await ctx.modules.tokens.fetchByToken({ tokens: [req.flowToken] });
    if (!flowToken) {
        throw new RuntimeError("invalid_token", { statusCode: 400 });
    }
    if (new Date(flowToken.expireAt ?? 0) < new Date()) {
        throw new RuntimeError("expired_token", { statusCode: 400 });
    }

    const flowId = flowToken.meta.flowId;
    if (!flowId) throw new RuntimeError("invalid_token", { statusCode: 400 });

    const flow = await ctx.db.query.loginAttempts.findFirst({
        where: Query.eq(loginAttempts.id, flowId),
    });
    if (!flow) throw new RuntimeError("invalid_token", { statusCode: 400 });

    if (!flow.identifier || !flow.tokenData) {
        throw new RuntimeError("flow_not_complete", { statusCode: 400 });
    }

    const tokenData = flow.tokenData;
    if (!tokenData) {
        throw new RuntimeError("internal_error", { statusCode: 500 });
    }
    if (typeof tokenData !== "object") {
        throw new RuntimeError("internal_error", { statusCode: 500 });
    }
    if (Array.isArray(tokenData)) {
        throw new RuntimeError("internal_error", { statusCode: 500 });
    }

    const actions = flow.actionData;
    if (!actions) {
        throw new RuntimeError("internal_error", { statusCode: 500 });
    }
    if (typeof actions !== "object") {
        throw new RuntimeError("internal_error", { statusCode: 500 });
    }
    const { connect, signIn, signUp } = actions as Record<string, unknown>;

    if (connect && typeof connect === "string") {
        await tryConnect(ctx, connect, flow.providerId, flow.identifier, tokenData);
        return {};
    }

    if (signIn) {
        const userToken = await trySignIn(ctx, flow.providerId, flow.identifier);
        if (userToken === null) {
            if (!signUp) {
                throw new RuntimeError("user_not_found");
            }
        } else {
            return { userToken };
        }
    }

    if (signUp) {
        const userToken = await trySignUp(ctx, flow.providerId, flow.identifier, tokenData);
        return { userToken };
    }
    
    throw new RuntimeError("db_err");
}
