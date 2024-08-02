export interface Config {
	provider: Provider;
}

export type Provider = { test: ProviderTest } | { sendGrid: ProviderSendGrid };

export type ProviderTest = Record<never, never>;

export interface ProviderSendGrid {
	apiKeyVariable?: string;
}
