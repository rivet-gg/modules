import { Config, ProviderEndpoints } from "../config.ts";
import { getFromOidcWellKnown } from "./wellknown.ts";

export interface FullConfig {
    providers: Record<string, ProviderConfig>;
    oauthSecret: string;
}

export interface ProviderConfig {
	name: string;
    clientId: string;
    clientSecret: string;
    endpoints: ProviderEndpoints;
}

export async function getProvidersEnvConfig(providerCfg: Config["providers"]): Promise<ProviderConfig[] | null> {
    const baseProviders = Object.entries(providerCfg).map(([name, config]) => ({ name, config }));

    const providers: ProviderConfig[] = [];
    for (const { name, config } of baseProviders) {
        const clientIdEnv = `${name.toUpperCase()}_OAUTH_CLIENT_ID`;
        const clientSecretEnv = `${name.toUpperCase()}_OAUTH_CLIENT_SECRET`;

        const clientId = Deno.env.get(clientIdEnv);
        const clientSecret = Deno.env.get(clientSecretEnv);
        if (!clientId || !clientSecret) return null;

        let resolvedConfig: ProviderEndpoints;
        if (typeof config === "string") {
            resolvedConfig = await getFromOidcWellKnown(config);
        } else {
            resolvedConfig = config;
        }

        providers.push({ name, clientId, clientSecret, endpoints: resolvedConfig });
    }

    return providers;
}

export function getOauthSecret(): string | null {
    return Deno.env.get("OAUTH_SECRET") ?? null;
}

export async function getFullConfig(cfg: Config): Promise<FullConfig | null> {
    const providerArr = await getProvidersEnvConfig(cfg.providers);
    if (!providerArr) return null;

    const providers = Object.fromEntries(providerArr.map(p => [p.name, p]));

    const oauthSecret = getOauthSecret();
    if (!oauthSecret) return null;

    return { providers, oauthSecret };
}
