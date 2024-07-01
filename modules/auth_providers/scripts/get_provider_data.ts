import { ScriptContext } from "../module.gen.ts";
import { ProviderData, ProviderInfo } from "../utils/types.ts";

export interface Request {
	userToken: string;
    info: ProviderInfo;
}

export interface Response {
    data: {
        uniqueData: ProviderData;
        additionalData: ProviderData;
    } | null;
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

    // Get provider data
    const provider = await ctx.db.providerEntries.findFirst({
        where: {
            userId,
            providerType: req.info.providerType,
            providerId: req.info.providerId,
        },
        select: {
            uniqueData: true,
            additionalData: true
        }
    });

    // Type checking to make typescript happy
    const data = provider ?? null;
    if (!data) {
        return { data: null };
    }

    const { uniqueData, additionalData } = data;
    if (typeof uniqueData !== 'object' || Array.isArray(uniqueData) || uniqueData === null) {
        return { data: null };
    }
    if (typeof additionalData !== 'object' || Array.isArray(additionalData) || additionalData === null) {
        return { data: null };
    }

    return { data: { uniqueData, additionalData } };
}
