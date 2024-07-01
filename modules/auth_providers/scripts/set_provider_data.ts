import { ScriptContext, Empty, RuntimeError } from "../module.gen.ts";
import { ProviderDataInput, ProviderInfo } from "../utils/types.ts";

export interface Request {
	userToken: string;
    info: ProviderInfo;
    uniqueData?: ProviderDataInput;
    additionalData: ProviderDataInput;
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

    // Error if this provider is not associated with the user
    const { data: prevData } = await ctx.modules.authProviders.getProviderData({ userToken: req.userToken, info: req.info });
    if (!prevData) throw new RuntimeError("provider_not_found");

    // Update the provider data where userId, providerType, and providerId match
    await ctx.db.providerEntries.update({
        where: {
            userId_providerType_providerId: {
                userId,
                providerType: req.info.providerType,
                providerId: req.info.providerId,
            }
        },
        data: req.uniqueData ? {
            uniqueData: req.uniqueData,
            additionalData: req.additionalData,
        } : { additionalData: req.additionalData },
    });

    return {};
}
