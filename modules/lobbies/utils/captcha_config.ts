import { Config, CaptchaProvider } from "../config.ts";

export const getCaptchaProvider = (config: Config): CaptchaProvider => {
    if (!config.captcha || !config.captcha.provider) return {
        test: {}
    }

    return config.captcha.provider;
}