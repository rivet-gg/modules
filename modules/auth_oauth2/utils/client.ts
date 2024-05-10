import { OAuth2Client } from "https://deno.land/x/oauth2_client@v1.0.2/mod.ts";
import { FullConfig, ProviderConfig } from "./env.ts";
import { RuntimeError } from "../module.gen.ts";

export function getClient(cfg: FullConfig, provider: string, uri: URL) {
	const providerCfg = cfg.providers[provider];
	if (!providerCfg) throw new RuntimeError("invalid_provider", { statusCode: 400 });

	const redirectUri = new URL(`./modules/auth_oauth2/route/callback/${provider}`, uri.origin).toString();

	return new OAuth2Client({
		clientId: providerCfg.clientId,
		clientSecret: providerCfg.clientSecret,
		authorizationEndpointUri: providerCfg.endpoints.authorization,
		tokenUri: providerCfg.endpoints.token,
		// TODO: Make this work with custom prefixes
		redirectUri,
		defaults: {
			scope: providerCfg.endpoints.scopes,
		},
	});
}

export async function getUserUniqueIdentifier(accessToken: string, provider: ProviderConfig): Promise<string> {
	const res = await fetch(provider.endpoints.userinfo, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!res.ok) throw new RuntimeError("bad_oauth_response", { statusCode: 502 });

	let json: unknown;
	try {
		json = await res.json();
	} catch {
		throw new RuntimeError("bad_oauth_response", { statusCode: 502 });
	}

	if (typeof json !== "object" || json === null) {
		throw new RuntimeError("bad_oauth_response", { statusCode: 502 });
	}

	const jsonObj = json as Record<string, unknown>;
	const uniqueIdent = jsonObj[provider.endpoints.userinfoKey];

	if (typeof uniqueIdent !== "string" && typeof uniqueIdent !== "number") {
		console.warn("Invalid userinfo response", jsonObj);
		throw new RuntimeError("bad_oauth_response", { statusCode: 502 });
	}
	if (!uniqueIdent) throw new RuntimeError("bad_oauth_response", { statusCode: 502 });

	return uniqueIdent.toString();
}
