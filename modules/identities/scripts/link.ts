import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { getData, listIdentities } from "../utils/db.ts";
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
    const { userId } = await ctx.modules.users.authenticateToken({ userToken: req.userToken } );

    return await ctx.db.$transaction(async tx => {
        // Error if this identity provider is ALREADY associated with the user
        if (await getData(tx, userId, req.info.identityType, req.info.identityId)) {
            throw new RuntimeError("identity_provider_already_added");
        }

        // Associate the identity provider data with the user
        await tx.userIdentities.create({
            data: {
                userId,
                identityType: req.info.identityType,
                identityId: req.info.identityId,
                uniqueData: req.uniqueData,
                additionalData: req.additionalData,
            },
        });

        return { identityProviders: await listIdentities(tx, userId) };
    });
}
