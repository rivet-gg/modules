import { RuntimeError, ScriptContext } from "../module.gen.ts";

export interface Request {}

export interface Response {
    sitekey: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    if ("hcaptcha" in ctx.config.provider) {
        return { sitekey: ctx.config.provider.hcaptcha.sitekey };
    } else if ("turnstile" in ctx.config.provider) {
        return { sitekey: ctx.config.provider.turnstile.sitekey };
    } else {
        return { sitekey: "" };
    }

}