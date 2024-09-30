import { CaptchaProvider, PublicCaptchaProviderConfig } from "./types.ts";

export const getPublicConfig = (provider: CaptchaProvider): PublicCaptchaProviderConfig => {
    if ("hcaptcha" in provider) {
        return {
            hcaptcha: { sitekey: provider.hcaptcha.sitekey }
        };
    } else if ("turnstile" in provider) {
        return {
            turnstile: {
                sitekey: provider.turnstile.sitekey
            }
        }
    } else {
        return {
            test: {}
        }
    }
}