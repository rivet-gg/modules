import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { IdentityDataInput, IdentityProviderInfo } from "../utils/types.ts";

export interface Request {
	userToken: string;
    info: IdentityProviderInfo;
    uniqueData: IdentityDataInput;
    additionalData: IdentityDataInput;
}

export interface Response {
	identityProviders: IdentityProviderInfo[];
}

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

    // Error if this identity provider is ALREADY associated with the user
    const { data: prevData } = await ctx.modules.identities.get({ userToken: req.userToken, info: req.info });
    if (prevData) throw new RuntimeError("identity_provider_already_added");

    // Add a new entry to the table with the associated data
    await ctx.db.userIdentities.create({
        data: {
            userId,
            identityType: req.info.identityType,
            identityId: req.info.identityId,
            uniqueData: req.uniqueData,
            additionalData: req.additionalData,
        },
    });

    return await ctx.modules.identities.list({ userToken: req.userToken });
}
