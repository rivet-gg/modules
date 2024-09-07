import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { validateHCaptchaResponse } from "../providers/hcaptcha.ts";
import { validateCFTurnstileResponse } from "../providers/turnstile.ts";


interface ProviderCFTurnstile {
    sitekey: string;
    secret: string;
}

interface ProviderHCaptcha {
    // TODO: Score threshold
    sitekey: string;
    secret: string;
}

type CaptchaProvider = { test: Record<never, never> }
    | { turnstile: ProviderCFTurnstile }
    | { hcaptcha: ProviderHCaptcha };

export type Request = {
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
    const token = req.token;
    const provider = req.provider;

    let success: boolean = false;
    if ("hcaptcha" in provider) {
        success = await validateHCaptchaResponse(provider.hcaptcha.secret, token);
    } else if ("turnstile" in provider) {
        success = await validateCFTurnstileResponse(provider.turnstile.secret, token);
    } else {
        success = true;
    }

    if (!success) {
        throw new RuntimeError("captcha_failed");
    }

    return { success: true };
}