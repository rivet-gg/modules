import { RuntimeError, ScriptContext, Database, Query } from "../module.gen.ts";
import { IdentityDataInput, IdentityProviderInfo } from "../utils/types.ts";

export interface Request {
    info: IdentityProviderInfo;
    uniqueData: IdentityDataInput;
    additionalData: IdentityDataInput;

    username?: string;
}

export interface Response {
    userToken: string;
    userId: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    return await ctx.db.transaction(async (tx) => {
        // If the identity provider is associated with a user, throw an error
        const identity = await ctx.db.query.userIdentities.findFirst({
            where: Query.and(
                Query.eq(Database.userIdentities.identityType, req.info.identityType),
                Query.eq(Database.userIdentities.identityId, req.info.identityId),
                Query.eq(Database.userIdentities.uniqueData, req.uniqueData)
            ),
        });
        if (identity) {
            throw new RuntimeError("identity_provider_already_used");
        }

        // Create a new user
        const { user } = await ctx.modules.users.create({ username: req.username });

        // Insert the identity data with the newly-created user
        await tx.insert(Database.userIdentities).values({
            userId: user.id,
            identityType: req.info.identityType,
            identityId: req.info.identityId,
            uniqueData: req.uniqueData,
            additionalData: req.additionalData,
        });
    
        // Generate a user token and return it
        const { token: { token } } = await ctx.modules.users.createToken({ userId: user.id });
        return {
            userToken: token,
            userId: user.id,
        };
    });
}
