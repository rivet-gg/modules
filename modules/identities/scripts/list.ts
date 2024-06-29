import { ScriptContext } from "../module.gen.ts";
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
    const { userId } = await ctx.modules.users.authenticateToken({ userToken: req.userToken } );

    // Select identityType and identityId entries that match the userId
    const identityProviders = await ctx.db.userIdentities.findMany({
        where: {
            userId,
        },
        select: {
            identityType: true,
            identityId: true,
        }
    });

    return { identityProviders };
}
