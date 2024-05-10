import { ModuleContext } from "../module.gen.ts";

export function getHttpPath<T extends ModuleContext>(ctx: T): string | undefined {
    for (const entry of ctx.trace.entries) {
        if ("httpRequest" in entry.type) {
            return entry.type.httpRequest.path;
        }
    }
    return undefined;
}

export function getCookieString<T extends ModuleContext>(ctx: T): string | undefined {
    for (const entry of ctx.trace.entries) {
        if ("httpRequest" in entry.type) {
            return entry.type.httpRequest.headers["cookie"];
        }
    }
    return undefined;
}

export function getCookieObject<T extends ModuleContext>(ctx: T): Record<string, string> | null {
    const cookieString = getCookieString(ctx);
    if (!cookieString) return null;

    const pairs = cookieString
        .split(";")
        .map(pair => pair.trim())
        .map(pair => pair.split("="))
        .map(([key, value]) => [decodeURIComponent(key), decodeURIComponent(value)]);
    
    return Object.fromEntries(pairs);
}


export function getLoginIdFromCookie<T extends ModuleContext>(ctx: T): string | null {
    const cookies = getCookieObject(ctx);
    if (!cookies) return null;
    return cookies["login_id"] || null;
}

export function getCodeVerifierFromCookie<T extends ModuleContext>(ctx: T): string | null {
    const cookies = getCookieObject(ctx);
    if (!cookies) return null;
    return cookies["code_verifier"] || null;
}

export function getStateFromCookie<T extends ModuleContext>(ctx: T): string | null {
    const cookies = getCookieObject(ctx);
    if (!cookies) return null;
    return cookies["state"] || null;
}
