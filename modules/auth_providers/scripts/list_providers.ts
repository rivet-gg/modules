import { ScriptContext } from "../module.gen.ts";
import { ProviderInfo } from "../utils/types.ts";

export interface Request {
	userToken: string;
}

export interface Response {
    providers: ProviderInfo[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

    // Ensure the user token is valid and get the user ID
    const { userId } = await ctx.modules.users.authenticateToken({ userToken: req.userToken } );

    // Select providerType and providerId entries that match the userId
    const providers = await ctx.db.providerEntries.findMany({
        where: {
            userId,
        },
        select: {
            providerType: true,
            providerId: true,
        }
    });

    return { providers };
}
