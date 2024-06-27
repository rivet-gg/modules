import { Module } from "../module.gen.ts";

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
export type OAuthProvider = Record<
	ProviderType.OAUTH,
	Module.authOauth2.ProviderIdentifierDetails
>;

export type Provider = EmailProvider | OAuthProvider;
