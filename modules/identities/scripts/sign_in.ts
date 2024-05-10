import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { IdentityDataInput, IdentityProviderInfo } from "../utils/types.ts";

export interface Request {
    info: IdentityProviderInfo;
    uniqueData: IdentityDataInput;
}

export interface Response {
    userToken: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    const key = req.info.identityType + ":" + req.info.identityId + ":" + JSON.stringify(req.uniqueData);
	await ctx.modules.rateLimit.throttle({
        key,
        period: 10,
        requests: 10,
        type: "user",
    });

    // Get users the provider is associated with
    const identity = await ctx.db.userIdentities.findFirst({
        where: {
            identityType: req.info.identityType,
            identityId: req.info.identityId,
            uniqueData: { equals: req.uniqueData },
        },
        select: {
            userId: true,
        },
    });

    // If the provider info/uniqueData combo is not associated with a user,
    // throw provider_not_found error.
    if (!identity) {
        throw new RuntimeError("identity_provider_not_found", { statusCode: 404 });
    }

    // Generate a user token
    const { token: { token } } = await ctx.modules.users.createToken({ userId: identity.userId });
    return { userToken: token };
}
