import { ScriptContext, Query, Database } from "../module.gen.ts";
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
    const { userId } = await ctx.modules.users.authenticateTokenInternal({ userToken: req.userToken });

    // Get identity data
    const identity = await ctx.db.query.userIdentities.findFirst({
        where: Query.and(
            Query.eq(Database.userIdentities.userId, userId),
            Query.eq(Database.userIdentities.identityType, req.info.identityType),
            Query.eq(Database.userIdentities.identityId, req.info.identityId)
        ),
        columns: {
            uniqueData: true,
            additionalData: true,
        },
    });
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
