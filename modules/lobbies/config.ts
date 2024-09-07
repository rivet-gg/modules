import { BackendLocalDevelopmentConfig, BackendLocalDevelopmentConfigPort } from "./utils/lobby/backend/local_development.ts";
import { BackendServerConfig } from "./utils/lobby/backend/server.ts";
import { BackendTestConfig } from "./utils/lobby/backend/test.ts";

export interface Config {
	lobbies: LobbyConfig;
	lobbyRules: LobbyRule[];
	players: {
		maxPerIp?: number;
		maxUnconnected?: number;
		unconnectedExpireAfter: number;
		autoDestroyAfter?: number;
	};
	captcha?: CaptchaProvider;
}

export interface LobbyRule {
	tags: Record<string, string>;
	config: Partial<LobbyConfig>;
}

export interface LobbyConfig extends Record<PropertyKey, unknown> {
  regions: string[];
	destroyOnEmptyAfter?: number | null;
	unreadyExpireAfter: number;
	maxPlayers: number;
	maxPlayersDirect: number;
	enableDynamicMaxPlayers?: PlayerRange;
	enableDynamicMaxPlayersDirect?: PlayerRange;
	enableCreate: boolean;
	enableDestroy: boolean;
	enableFind: boolean;
	enableFindOrCreate: boolean;
	enableJoin: boolean;
	enableList: boolean;
	backend: LobbyBackend;
}

export interface PlayerRange {
	min: number;
	max: number;
}

export type LobbyBackend = { test: BackendTestConfig } | { localDevelopment: BackendLocalDevelopmentConfig } | { server: BackendServerConfig };


export type CaptchaProvider = { test: Record<never, never> }
    | { turnstile: ProviderCFTurnstile }
    | { hcaptcha: ProviderHCaptcha };
	
export interface ProviderCFTurnstile {
    sitekey: string;
    secret: string;
}

export interface ProviderHCaptcha {
    // TODO: Score threshold
    sitekey: string;
    secret: string;
}
