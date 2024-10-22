import { Database, ModuleContext, Query, RuntimeError } from "../module.gen.ts";

export type Verification = typeof Database.verifications.$inferSelect;

export function verificationIsInvalid(verification: typeof Database.verifications.$inferSelect): boolean {
    const expired = verification.expireAt.getTime() > Date.now();
    const overattempted = verification.attemptCount > verification.maxAttemptCount;

    return expired || overattempted;
}

export async function moveToOldIfNecessary<Ctx extends ModuleContext>(ctx: Ctx, code: string): Promise<boolean> {
    return await ctx.db.transaction(async tx => {
        const [deleted] = await tx.delete(Database.verifications).where(Query.and(
            Query.eq(Database.verifications.code, code),
            Query.or(
                Query.lte(Database.verifications.expireAt, new Date()),
                Query.gte(Database.verifications.attemptCount, Database.verifications.maxAttemptCount),
            ),
        )).returning();
        if (!deleted) return false;

        await tx.insert(Database.oldVerifications).values({
            id: deleted.id,
            data: deleted.data,
            code: deleted.code,
            token: deleted.token,
            attemptsCount: deleted.attemptCount,
            wasCompleted: false,
            createdAt: deleted.createdAt,
            invalidatedAt: deleted.attemptCount >= deleted.maxAttemptCount ? new Date() : null,
            expiredAt: deleted.expireAt.getTime() >= Date.now() ? deleted.expireAt : null,
            completedAt: null,
        });

        return true;
    })
}

export async function complete<Ctx extends ModuleContext>(ctx: Ctx, id: string): Promise<Verification> {
    return await ctx.db.transaction(async tx => {
        const [deleted] = await tx.delete(Database.verifications).where(
            Query.eq(Database.verifications.id, id),
        ).returning();

        if (!deleted) throw new RuntimeError("no_verification_found");

        await tx.insert(Database.oldVerifications).values({
            id: deleted.id,
            data: deleted.data,
            code: deleted.code,
            token: deleted.token,
            attemptsCount: deleted.attemptCount,
            wasCompleted: true,
            createdAt: deleted.createdAt,
            invalidatedAt: null,
            expiredAt: null,
            completedAt: new Date(),
        });

        return deleted;
    })
}

export async function invalidate<Ctx extends ModuleContext>(ctx: Ctx, token: string): Promise<Verification> {
    return await ctx.db.transaction(async tx => {
        const [deleted] = await tx.delete(Database.verifications).where(
            Query.eq(Database.verifications.token, token),
        ).returning();

        if (!deleted) throw new RuntimeError("no_verification_found");

        await tx.insert(Database.oldVerifications).values({
            id: deleted.id,
            data: deleted.data,
            code: deleted.code,
            token: deleted.token,
            attemptsCount: deleted.attemptCount,
            wasCompleted: false,
            createdAt: deleted.createdAt,
            invalidatedAt: new Date(),
            expiredAt: null,
            completedAt: null,
        });

        return deleted;
    })
}
