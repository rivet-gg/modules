import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { validateHCaptchaResponse } from "../providers/hcaptcha.ts";
import { validateCFTurnstileResponse } from "../providers/turnstile.ts";

export interface Request {
    token: string;
}

export interface Response {
    success: true;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    const token = req.token;

    let success: boolean = false;
    if ("hcaptcha" in ctx.config.provider) {
        success = await validateHCaptchaResponse(ctx.config.provider.hcaptcha.secret, token);
    } else if ("turnstile" in ctx.config.provider) {
        success = await validateCFTurnstileResponse(ctx.config.provider.turnstile.secret, token);
    } else {
        success = true;
    }

    if (!success) {
        throw new RuntimeError("captcha_failed");
    }

    return { success: true };
}