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

    const { userId } = await ctx.modules.users.authenticateToken({ userToken: req.userToken } );

    return {
        providers: await ctx.db.providerEntries.findMany({
            where: {
                userId,
            },
            select: {
                providerType: true,
                providerId: true,
            }
        }),
    };
}
