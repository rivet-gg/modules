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
    try {
        return await ctx.modules.identities.signIn({
            info: req.info,
            uniqueData: req.uniqueData,
        });
    } catch (e) {
        if (e instanceof RuntimeError) {
            if (e.code === "identity_not_found") {
                return await ctx.modules.identities.signUp({
                    info: req.info,
                    uniqueData: req.uniqueData,
                    additionalData: req.additionalData,
                    username: req.username,
                });
            }
        }
        throw e;
    }
}
