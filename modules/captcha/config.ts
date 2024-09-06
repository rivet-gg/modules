export interface Config {
	provider: Provider;
}

export type Provider = { test: ProviderTest }
    | { turnstile: ProviderCFTurnstile }
    | { hcaptcha: ProviderHCaptcha }

export type ProviderTest = Record<never, never>;

export interface ProviderCFTurnstile {
    sitekey: string;
    secret: string;
}

export interface ProviderHCaptcha {
    // TODO: Score threshold
    sitekey: string;
    secret: string;
}
