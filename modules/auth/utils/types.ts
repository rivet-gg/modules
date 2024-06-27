export interface FlowToken {
	token: string;
}

export interface Session {
	token: string;
	expireAt: string;
}

export enum ProviderType {
	EMAIL = "email",
	OAUTH = "oauth",
}

export type EmailProvider = Record<
	ProviderType.EMAIL,
	{ passwordless: boolean }
>;
export type OAuthProvider = Record<ProviderType.OAUTH, { provider: string }>;

export type Provider = EmailProvider | OAuthProvider;
