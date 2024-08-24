import { prisma } from "../module.gen.ts";

export type IdentityData = Record<string, unknown>;
export type IdentityDataInput = IdentityData & prisma.Prisma.InputJsonValue;

export interface IdentityProviderInfo {
    identityType: string;
    identityId: string;
}
