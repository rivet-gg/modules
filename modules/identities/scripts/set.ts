import { ScriptContext, Empty, RuntimeError } from "../module.gen.ts";
import { IdentityDataInput, IdentityProviderInfo } from "../utils/types.ts";

export interface Request {
	userToken: string;
    info: IdentityProviderInfo;
    uniqueData?: IdentityDataInput;
    additionalData: IdentityDataInput;
}

export type Response = Empty;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttle({
        key: req.userToken,
        period: 10,
        requests: 10,
        type: "user",
    });

    // Ensure the user token is valid and get the user ID
    const { userId } = await ctx.modules.users.authenticateToken({ userToken: req.userToken } );

    // Error if this identity provider is not associated with the user
    const { data: prevData } = await ctx.modules.identities.get({ userToken: req.userToken, info: req.info });
    if (!prevData) throw new RuntimeError("identity_provider_not_found");


    // Update the identity data where userId, identityType, and identityId match
    await ctx.db.userIdentities.update({
        where: {
            userId_identityType_identityId: {
                userId,
                identityType: req.info.identityType,
                identityId: req.info.identityId,
            }
        },
        data: {
            uniqueData: req.uniqueData,
            additionalData: req.additionalData,
        },
    });

    return {};
}
