import { RuntimeError } from "../module.gen.ts";
import { ProviderEndpoints } from "../config.ts";

/**
 * Get the OIDC well-known config object from the given URL.
 * 
 * @param wellKnownUrl The URL of the OIDC well-known config
 * @returns The OIDC well-known config object
 */
export async function getFromOidcWellKnown(wellKnownUrl: string): Promise<ProviderEndpoints> {
    const res = await fetch(wellKnownUrl).catch(() => { throw new RuntimeError("invalid_config") });
    if (!res.ok) throw new RuntimeError("invalid_config");

    const json: unknown = await res.json().catch(() => { throw new RuntimeError("invalid_config") });
    if (typeof json !== "object" || json === null) throw new RuntimeError("invalid_config");

    const jsonObj = json as Record<string, unknown>;

    const {
        authorization_endpoint,
        token_endpoint,
        userinfo_endpoint,
        scopes_supported,
    } = jsonObj;

    if (typeof authorization_endpoint !== "string") throw new RuntimeError("invalid_config");
    if (typeof token_endpoint !== "string") throw new RuntimeError("invalid_config");
    if (typeof userinfo_endpoint !== "string") throw new RuntimeError("invalid_config");
    if (!Array.isArray(scopes_supported)) throw new RuntimeError("invalid_config");
    if (scopes_supported.some(scope => typeof scope !== "string")) throw new RuntimeError("invalid_config");


    return {
        authorization: authorization_endpoint,
        token: token_endpoint,
        userinfo: userinfo_endpoint,
        scopes: scopes_supported.join(" "),
        userinfoKey: "sub",
    };
}
