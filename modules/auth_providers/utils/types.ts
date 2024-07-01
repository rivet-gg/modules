import { prisma } from "../module.gen.ts";

export type ProviderData = Record<string, unknown>;
export type ProviderDataInput = ProviderData & prisma.Prisma.InputJsonValue;

export interface ProviderInfo {
    providerType: string;
    providerId: string;
}


