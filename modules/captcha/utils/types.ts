

interface ProviderCFTurnstile {
    sitekey: string;
    secret: string;
}

interface ProviderHCaptcha {
    // TODO: Score threshold
    sitekey: string;
    secret: string;
}
type PublicCFTurnstileConfig = { sitekey: string; }
type PublicHCaptchaConfig = { sitekey: string; }

export type CaptchaProvider = { test: Record<never, never> }
    | { turnstile: ProviderCFTurnstile }
    | { hcaptcha: ProviderHCaptcha };

export type PublicCaptchaProviderConfig = { test: Record<never, never> }
    | { turnstile: PublicCFTurnstileConfig }
    | { hcaptcha: PublicHCaptchaConfig };

export interface ThrottleRequest {
    requests: number;
    period: number;
}

export interface ThrottleResponse {
    success: boolean;
}