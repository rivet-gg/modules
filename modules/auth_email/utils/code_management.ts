import { RuntimeError, ScriptContext, Module } from "../module.gen.ts";

const MAX_ATTEMPT_COUNT = 3;
const EXPIRATION_TIME = 60 * 60 * 1000;



export async function createVerification(ctx: ScriptContext, email: string) {
	// Create verification
	const code = Module.tokens.generateRandomCodeSecure("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);
	const verification = await ctx.db.verifications.create({
		data: {
			token: Module.tokens.genSecureId(),
			email,
			code,
			maxAttemptCount: MAX_ATTEMPT_COUNT,
			expireAt: new Date(Date.now() + EXPIRATION_TIME),
		},
		select: { token: true },
	});

	return { verification, code };
}

export async function verifyCode(
	ctx: ScriptContext,
	verificationToken: string,
	codeInput: string,
) {
	await ctx.modules.rateLimit.throttlePublic({});

	const code = codeInput.toUpperCase();

	return await ctx.db.$transaction(async (tx) => {
		const verification = await tx.verifications.update({
			where: {
				token: verificationToken,
			},
			data: {
				attemptCount: {
					increment: 1,
				},
			},
			select: {
				email: true,
				code: true,
				expireAt: true,
				completedAt: true,
				attemptCount: true,
				maxAttemptCount: true,
			},
		});
		if (!verification) {
			throw new RuntimeError("verification_code_invalid");
		}
		if (verification.attemptCount >= verification.maxAttemptCount) {
			throw new RuntimeError("verification_code_attempt_limit");
		}
		if (verification.completedAt !== null) {
			throw new RuntimeError("verification_code_already_used");
		}
		if (verification.code !== code) {
			// Same error as above to prevent exploitation
			throw new RuntimeError("verification_code_invalid");
		}
		if (verification.expireAt < new Date()) {
			throw new RuntimeError("verification_code_expired");
		}

		const completedAt = new Date();

		// Mark as used
		const verificationConfirmation = await tx.verifications
			.update({
				where: {
					token: verificationToken,
					completedAt: null,
				},
				data: {
					completedAt,
				},
			});
		if (verificationConfirmation === null) {
			throw new RuntimeError("verification_code_already_used");
		}

		return {
			email: verificationConfirmation.email,
			completedAt,
		};
	});
}
