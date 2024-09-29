import { ScriptContext, Empty, RuntimeError, Database, Query } from "../module.gen.ts";
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
    // Ensure the user token is valid and get the user ID
    const { userId } = await ctx.modules.users.authenticateTokenInternal({ userToken: req.userToken } );

    await ctx.db.transaction(async (tx) => {
        // Ensure the identity provider is associated with the user
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
        if (!identity) {
            throw new RuntimeError("identity_provider_not_found");
        }

        // Update the associated data
        await tx.update(Database.userIdentities)
            .set({
                uniqueData: req.uniqueData,
                additionalData: req.additionalData,
            })
            .where(Query.and(
                Query.eq(Database.userIdentities.userId, userId),
                Query.eq(Database.userIdentities.identityType, req.info.identityType),
                Query.eq(Database.userIdentities.identityId, req.info.identityId)
            ));
    });

    return {};
}
