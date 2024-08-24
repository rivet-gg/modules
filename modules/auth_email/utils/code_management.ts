import { RuntimeError, ScriptContext, Module, Database, Query } from "../module.gen.ts";

const MAX_ATTEMPT_COUNT = 3;
const EXPIRATION_TIME = 60 * 60 * 1000;

export async function createVerification(ctx: ScriptContext, email: string) {
	// Create verification
	const code = Module.tokens.generateRandomCodeSecure("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);
	const verification = await ctx.db.insert(Database.verifications)
		.values({
			token: Module.tokens.genSecureId(),
			email,
			code,
			maxAttemptCount: MAX_ATTEMPT_COUNT,
			expireAt: new Date(Date.now() + EXPIRATION_TIME),
		})
		.returning();

	return { verification: verification[0]!, code };
}

export async function verifyCode(
	ctx: ScriptContext,
	verificationToken: string,
	codeInput: string,
) {
	await ctx.modules.rateLimit.throttlePublic({});

	const code = codeInput.toUpperCase();

	return await ctx.db.transaction(async (tx) => {
		const verification = await tx.update(Database.verifications)
			.set({
				attemptCount: Query.sql`${Database.verifications.attemptCount} + 1`,
			})
			.where(Query.eq(Database.verifications.token, verificationToken))
			.returning();
		if (!verification[0]) {
			throw new RuntimeError("verification_code_invalid");
		}
		if (verification[0]!.attemptCount >= verification[0]!.maxAttemptCount) {
			throw new RuntimeError("verification_code_attempt_limit");
		}
		if (verification[0]!.completedAt !== null) {
			throw new RuntimeError("verification_code_already_used");
		}
		if (verification[0]!.code !== code) {
			// Same error as above to prevent exploitation
			throw new RuntimeError("verification_code_invalid");
		}
		if (verification[0]!.expireAt < new Date()) {
			throw new RuntimeError("verification_code_expired");
		}

		const completedAt = new Date();

		// Mark as used
		const verificationConfirmation = await tx.update(Database.verifications)
			.set({
				completedAt,
			})
			.where(Query.and(
				Query.eq(Database.verifications.token, verificationToken),
				Query.isNull(Database.verifications.completedAt)
			))
			.returning();
		if (verificationConfirmation.length === 0) {
			throw new RuntimeError("verification_code_already_used");
		}

		return {
			email: verificationConfirmation[0]!.email,
			completedAt,
		};
	});
}