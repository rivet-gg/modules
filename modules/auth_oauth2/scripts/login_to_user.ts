import { RuntimeError, ScriptContext } from "../module.gen.ts";

export interface Request {
    flowToken: string;
}

export type Response = ReturnType<ScriptContext["modules"]["authProviders"]["getOrCreateUserFromProvider"]>;

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

    const flow = await ctx.db.loginAttempts.findFirst({
        where: {
            id: flowId,
        }
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

    return await ctx.modules.authProviders.getOrCreateUserFromProvider({
        info: {
            providerType: "oauth2",
            providerId: flow.providerId,
        },
        uniqueData: {
            identifier: flow.identifier,
        },
        additionalData: tokenData,
    });
}
