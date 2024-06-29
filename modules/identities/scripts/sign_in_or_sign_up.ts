import { ScriptContext } from "../module.gen.ts";
import { getUserId } from "../utils/db.ts";
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
    return await ctx.db.$transaction(async tx => {
        const userId = await getUserId(tx, req.info.identityType, req.info.identityId, req.uniqueData);

        // If the identity provider is associated with a user, sign in
        if (userId) {
            // Generate a user token
            const { token: { token } } = await ctx.modules.users.createToken({ userId });
            return {
                userToken: token,
                userId,
            };
        } else {
            // Otherwise, create a new user
            const { user } = await ctx.modules.users.create({ username: req.username });

            // Insert the identity data with the newly-created user
            await tx.userIdentities.create({
                data: {
                    userId: user.id,
                    identityType: req.info.identityType,
                    identityId: req.info.identityId,
                    uniqueData: req.uniqueData,
                    additionalData: req.additionalData,
                },
            });
        
            // Generate a user token and return it
            const { token: { token } } = await ctx.modules.users.createToken({ userId: user.id });
            return {
                userToken: token,
                userId: user.id,
            };
        }
    });
}
