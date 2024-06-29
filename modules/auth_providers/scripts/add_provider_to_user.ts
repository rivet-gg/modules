import { RuntimeError, ScriptContext, prisma } from "../module.gen.ts";
import { ProviderData, ProviderInfo } from "../utils/types.ts";

export interface Request {
	userToken: string;
    info: ProviderInfo;
    data: ProviderData & prisma.Prisma.InputJsonValue;
}

export interface Response {
	providers: ProviderInfo[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttle({
        key: req.userToken,
        period: 10,
        requests: 10,
        type: "user",
    });

    // Ensure the user token is valid and get the user ID
    const { userId } = await ctx.modules.users.authenticateToken({ userToken: req.userToken } );

    // Error if this provider is ALREADY associated with the user
    const { data: prevData } = await ctx.modules.authProviders.getProviderData({ userToken: req.userToken, info: req.info });
    if (prevData) throw new RuntimeError("provider_already_added");

    // Add a new entry to the table with the associated data
    await ctx.db.providerEntries.create({
        data: {
            userId,
            providerType: req.info.providerType,
            providerId: req.info.providerId,
            providerData: req.data,
        },
    });

    return await ctx.modules.authProviders.listProviders({ userToken: req.userToken });
}
