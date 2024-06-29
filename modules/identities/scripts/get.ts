import { ScriptContext } from "../module.gen.ts";
import { IdentityData, IdentityProviderInfo } from "../utils/types.ts";

export interface Request {
	userToken: string;
    info: IdentityProviderInfo;
}

export interface Response {
    data: {
        uniqueData: IdentityData;
        additionalData: IdentityData;
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

    // Get identity data
    const identity = await ctx.db.userIdentities.findFirst({
        where: {
            userId,
            identityType: req.info.identityType,
            identityId: req.info.identityId,
        },
        select: {
            uniqueData: true,
            additionalData: true
        }
    });

    // Type checking to make typescript happy
    const data = identity ?? null;
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
