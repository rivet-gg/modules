import { ScriptContext } from "../module.gen.ts";
import { IdentityDataInput, IdentityProviderInfo } from "../utils/types.ts";

export interface Request {
    info: IdentityProviderInfo;
    uniqueData: IdentityDataInput;
}

export interface Response {
    userToken: string;
    userId: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    // Get user the provider is associated with
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
        throw new Error("identity_not_found");
    }

    // Generate a user token
    const { token: { token } } = await ctx.modules.users.createToken({ userId: identity.userId });
    return {
        userToken: token,
        userId: identity.userId,
    };
}
