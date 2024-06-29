import { ScriptContext } from "../module.gen.ts";
import { getData } from "../utils/db.ts";
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
    // Ensure the user token is valid and get the user ID
    const { userId } = await ctx.modules.users.authenticateToken({ userToken: req.userToken });

    // Get identity data
    const identity = await getData(ctx.db, userId, req.info.identityType, req.info.identityId);
    if (!identity) return { data: null };

    // Ensure data is of correct type
    const { uniqueData, additionalData } = identity;
    if (typeof uniqueData !== 'object' || Array.isArray(uniqueData) || uniqueData === null) {
        return { data: null };
    }
    if (typeof additionalData !== 'object' || Array.isArray(additionalData) || additionalData === null) {
        return { data: null };
    }

    return { data: { uniqueData, additionalData } };
}
