import { ScriptContext } from "../module.gen.ts";
import { ProviderData, ProviderInfo } from "../utils/types.ts";

export interface Request {
	userToken: string;
    info: ProviderInfo;
}

export interface Response {
    data: ProviderData | null;
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

    const { userId } = await ctx.modules.users.authenticateToken({ userToken: req.userToken } );

    const provider = await ctx.db.providerEntries.findFirst({
        where: {
            userId,
            providerType: req.info.providerType,
            providerId: req.info.providerId,
        },
        select: {
            providerData: true,
        }
    });

    const data = provider?.providerData;

    if (data && typeof data === 'object' && !Array.isArray(data)) {
        return { data };
    } else {
        return { data: null };
    }
}
