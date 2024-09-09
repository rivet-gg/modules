import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { getPublicConfig } from "../utils/get_sitekey.ts";
// import { getPublicConfig } from "../utils/get_sitekey.ts";
import type { CaptchaProvider, ThrottleRequest, ThrottleResponse } from "../utils/types.ts";

export interface Request {
    type: string;
    key: string;
    requests: number;
    period: number;
    captchaToken?: string | null,
    captchaProvider: CaptchaProvider
}

export interface Response {
    success: true;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const key = `${JSON.stringify(req.type)}.${JSON.stringify(req.key)}`;

    if (req.captchaToken) {
        try {
            await ctx.modules.captcha.verifyCaptchaToken({
                token: req.captchaToken,
                provider: req.captchaProvider
            });

            await ctx.actors.throttle.getOrCreateAndCall<undefined, {}, {}>(key, undefined, "reset", {});

            return { success: true };
        } catch {
            // If we error, it means the captcha failed, we can continue with our normal ratelimitting
        }
    }

    const res = await ctx.actors.throttle.getOrCreateAndCall<
        undefined,
        ThrottleRequest,
        ThrottleResponse
    >(key, undefined, "throttle", {
        requests: req.requests,
        period: req.period,
    });

    if (!res.success) {
        throw new RuntimeError("captcha_needed", {
            meta: getPublicConfig(req.captchaProvider)
        });
    }

    return { success: true };
}