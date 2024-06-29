import { ScriptContext, Empty, RuntimeError } from "../module.gen.ts";
import { getData } from "../utils/db.ts";
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
    const { userId } = await ctx.modules.users.authenticateToken({ userToken: req.userToken } );

    await ctx.db.$transaction(async tx => {
        // Ensure the identity provider is associated with the user
        if (!await getData(tx, userId, req.info.identityType, req.info.identityId)) {
            throw new RuntimeError("identity_provider_not_found");
        }

        // Update the associated data
        await tx.userIdentities.update({
            where: {
                userId_identityType_identityId: {
                    userId,
                    identityType: req.info.identityType,
                    identityId: req.info.identityId,
                }
            },
            data: {
                uniqueData: req.uniqueData,
                additionalData: req.additionalData,
            },
        });
    });

    return {};
}
