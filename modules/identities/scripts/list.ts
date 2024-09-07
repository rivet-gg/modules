import { ScriptContext, Database, Query } from "../module.gen.ts";
import { IdentityProviderInfo } from "../utils/types.ts";

export interface Request {
	userToken: string;
}

export interface Response {
    identityProviders: IdentityProviderInfo[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

    // Ensure the user token is valid and get the user ID
    const { userId } = await ctx.modules.users.authenticateTokenInternal({ userToken: req.userToken } );

    const identityProviders = await ctx.db.query.userIdentities.findMany({
        where: Query.eq(Database.userIdentities.userId, userId),
        columns: {
            identityType: true,
            identityId: true,
        }
    });

    return { identityProviders };
}
