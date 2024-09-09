import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { validateHCaptchaResponse } from "../utils/providers/hcaptcha.ts";
import { validateCFTurnstileResponse } from "../utils/providers/turnstile.ts";
// import { validateHCaptchaResponse } from "../providers/hcaptcha.ts";
// import { validateCFTurnstileResponse } from "../providers/turnstile.ts";
import { CaptchaProvider } from "../utils/types.ts";

export interface Request {
    token: string,
    provider: CaptchaProvider
}

export interface Response {
    success: true;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    const captchaToken = req.token;
    const captchaProvider = req.provider;

    let success: boolean = false;
    if ("hcaptcha" in captchaProvider) {
        success = await validateHCaptchaResponse(captchaProvider.hcaptcha.secret, captchaToken);
    } else if ("turnstile" in captchaProvider) {
        success = await validateCFTurnstileResponse(captchaProvider.turnstile.secret, captchaToken);
    } else {
        success = true;
    }

    if (!success) {
        throw new RuntimeError("captcha_failed");
    }

    return { success: true };
}