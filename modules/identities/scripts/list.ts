import { ScriptContext } from "../module.gen.ts";
import { listIdentities } from "../utils/db.ts";
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

    return { identityProviders: await listIdentities(ctx.db, userId) };
}
