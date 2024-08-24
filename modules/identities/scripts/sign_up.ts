import { RuntimeError, ScriptContext } from "../module.gen.ts";
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
        // If the identity provider is associated with a user, throw an error
        if (await getUserId(tx, req.info.identityType, req.info.identityId, req.uniqueData)) {
            throw new RuntimeError("identity_provider_already_used");
        }

        // Create a new user
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
    });
}
