import { ScriptContext } from "../module.gen.ts";
import { ProviderDataInput, ProviderInfo } from "../utils/types.ts";

export interface Request {
    info: ProviderInfo;
    uniqueData: ProviderDataInput;
    additionalData: ProviderDataInput;

    suggestedUsername?: string;
}

export interface Response {
    userToken: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    const key = req.info.providerType + ":" + req.info.providerId + ":" + JSON.stringify(req.uniqueData);
	await ctx.modules.rateLimit.throttle({
        key,
        period: 10,
        requests: 10,
        type: "user",
    });

    // Get users the provider is associated with
    const providers = await ctx.db.providerEntries.findFirst({
        where: {
            providerType: req.info.providerType,
            providerId: req.info.providerId,
            uniqueData: { equals: req.uniqueData },
        },
        select: {
            userId: true,
        },
    });

    // If the provider is associated with a user, generate a user token and
    // return it
    if (providers) {
        const { token: { token } } = await ctx.modules.users.createToken({ userId: providers.userId });
        return { userToken: token };
    }

    // If the provider is not associated with a user, create a new user
    const { user } = await ctx.modules.users.create({ username: req.suggestedUsername });

    // Insert the provider data with the newly-created user
    await ctx.db.providerEntries.create({
        data: {
            userId: user.id,
            providerType: req.info.providerType,
            providerId: req.info.providerId,
            uniqueData: req.uniqueData,
            additionalData: req.additionalData,
        },
    });

    // Generate a user token and return it
    const { token: { token } } = await ctx.modules.users.createToken({ userId: user.id });

    return { userToken: token };
}
