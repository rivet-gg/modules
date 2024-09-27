import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { ReqOf, ResOf } from "../utils/types.ts";

export type Request = ReqOf<
	ScriptContext["modules"]["authEmail"]["verifySignUpEmailPass"]
>;
export type Response = ResOf<
	ScriptContext["modules"]["authEmail"]["verifySignUpEmailPass"]
>;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	return await ctx.modules.authEmail.verifySignUpEmailPass(req);
}
