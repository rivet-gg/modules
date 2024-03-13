export interface Config {
	provider: Provider;
}

export type Provider = { test: ProviderTest } | { sendGrid: ProviderSendGrid };

export interface ProviderTest {
	// No configuration
}

export interface ProviderSendGrid {
	apiKeyVariable?: string;
}
