import { RuntimeError, ScriptContext } from "../module.gen.ts";

function generateCode(): string {
	const length = 8;
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let result = "";
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
}

const MAX_ATTEMPT_COUNT = 3;
const EXPIRATION_TIME = 60 * 60 * 1000;

export async function createVerification(ctx: ScriptContext, email: string) {
	// Create verification
	const code = generateCode();
	const verification = await ctx.db.verifications.create({
		data: {
			email,
			code,
			maxAttemptCount: MAX_ATTEMPT_COUNT,
			expireAt: new Date(Date.now() + EXPIRATION_TIME),
		},
		select: { id: true },
	});

	return { verification, code };
}

export async function verifyCode(
	ctx: ScriptContext,
	verificationId: string,
	codeInput: string,
) {
	await ctx.modules.rateLimit.throttlePublic({});

	const code = codeInput.toUpperCase();

	return await ctx.db.$transaction(async (tx) => {
		const verification = await tx.verifications.update({
			where: {
				id: verificationId,
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
					id: verificationId,
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
