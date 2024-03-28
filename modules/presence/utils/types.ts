import { JsonArray, JsonObject, JsonValue } from "../_gen/prisma/runtime/library.d.ts";
import { Presence as PrismaPresence } from "../_gen/prisma/index.d.ts";

export interface Presence {
    identityId: string;
    gameId: string;
    message?: string;
    publicMeta: JsonObject | JsonArray;
    mutualMeta: JsonObject | JsonArray;

    expiresInMs?: number;

    createdAt: number;
    updatedAt: number;
}

export type InputPresence = Omit<Presence, "createdAt" | "updatedAt">;

const coalesceToObjectOrArray = (value: JsonValue): JsonObject | JsonArray => {
    if (typeof value === 'object' && value !== null) {
        return value;
    }
    if (Array.isArray(value)) {
        return value;
    }
    return {};
}

export const inputToPrisma = (presence: InputPresence) => ({
    ...presence,
    expiresInMs: undefined,
    expires: presence.expiresInMs === undefined ? null : new Date(Date.now() + presence.expiresInMs).toISOString(),
    publicMeta: presence.publicMeta,
    mutualMeta: presence.mutualMeta,
    updatedAt: new Date().toISOString(),
});

export const prismaToOutput = (presence: PrismaPresence): Presence => ({
    ...presence,
    message: presence.message ?? undefined,

    // @ts-expect-error: `expires` needs to be removed from PrismaPresence, but it isn't in Presence
    expires: undefined,
    expiresInMs: presence.expires === null ? undefined : presence.expires.getTime() - Date.now(),

    publicMeta: coalesceToObjectOrArray(presence.publicMeta),
    mutualMeta: coalesceToObjectOrArray(presence.publicMeta),
    createdAt: new Date(presence.createdAt).getTime(),
    updatedAt: new Date(presence.updatedAt).getTime(),
});
