import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { IdentityDataInput, IdentityProviderInfo } from "../utils/types.ts";

export interface Request {
    info: IdentityProviderInfo;
    uniqueData: IdentityDataInput;
    additionalData: IdentityDataInput;

    username?: string;
}

export interface Response {
    userToken: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    const key = req.info.identityType + ":" + req.info.identityId + ":" + JSON.stringify(req.uniqueData);
	await ctx.modules.rateLimit.throttle({
        key,
        period: 10,
        requests: 10,
        type: "user",
    });

    // Get users the provider is associated with
    const identity = await ctx.db.userIdentities.findFirst({
        where: {
            identityType: req.info.identityType,
            identityId: req.info.identityId,
            uniqueData: { equals: req.uniqueData },
        },
        select: {
            userId: true,
        },
    });

    // If the identity provider is associated with a user, throw an error
    if (identity) {
        throw new RuntimeError("identity_provider_already_used");
    }

    // Create a new user
    const { user } = await ctx.modules.users.create({ username: req.username });

    // Insert the identity data with the newly-created user
    await ctx.db.userIdentities.create({
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

    return { userToken: token };
}
