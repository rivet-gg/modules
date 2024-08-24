import { prisma } from "../module.gen.ts";

import { IdentityDataInput } from "./types.ts";


type DataDb = { userIdentities: prisma.PrismaClient<prisma.Prisma.PrismaClientOptions>["userIdentities"] };

export async function getUserId(
    db: DataDb,
    identityType: string,
    identityId: string,
    uniqueData: IdentityDataInput,
) {
    const identity = await db.userIdentities.findFirst({
        where: {
            identityType,
            identityId,
            uniqueData: { equals: uniqueData },
        },
        select: {
            userId: true,
        },
    });

    return identity?.userId;
}

export async function getData(
    db: DataDb,
    userId: string,
    identityType: string,
    identityId: string,
) {
    const identity = await db.userIdentities.findFirst({
        where: {
            userId,
            identityType,
            identityId,
        },
        select: {
            uniqueData: true,
            additionalData: true,
        },
    });

    return identity;
}


export async function listIdentities(
    db: DataDb,
    userId: string,
) {
    return await db.userIdentities.findMany({
        where: {
            userId,
        },
        select: {
            identityType: true,
            identityId: true,
        }
    });
}
