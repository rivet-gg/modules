import { RuntimeError, ScriptContext, Query, Database } from "../module.gen.ts";
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

    // Ensure the user token is valid and get the user ID
    const { userId } = await ctx.modules.users.authenticateTokenInternal({ userToken: req.userToken } );

    return await ctx.db.transaction(async (tx) => {
        // Error if this identity provider is ALREADY associated with the user
        const identity = await tx.query.userIdentities.findFirst({
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
        if (identity) {
            throw new RuntimeError("identity_provider_already_added");
        }

        // Associate the identity provider data with the user
        await tx.insert(Database.userIdentities).values({
            userId,
            identityType: req.info.identityType,
            identityId: req.info.identityId,
            uniqueData: req.uniqueData,
            additionalData: req.additionalData,
        });

        const identityProviders = await ctx.db.query.userIdentities.findMany({
            where: Query.eq(Database.userIdentities.userId, userId),
            columns: {
                identityType: true,
                identityId: true,
            }
        });

        return { identityProviders };
    });
}
