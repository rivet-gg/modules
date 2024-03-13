import { assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
	RuntimeError,
	ScriptContext,
} from "../_gen/scripts/verify_email_passwordless.ts";
import { TokenWithSecret } from "../../tokens/types/common.ts";

export interface Request {
	verificationId: string;
	code: string;
}

export interface Response {
	token: TokenWithSecret;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

	const code = req.code.toUpperCase();

	// Validate & mark as used
	let userId: string | undefined;
	await ctx.db.$transaction(async (tx) => {
		const verification = await tx.emailPasswordlessVerification.update({
			where: {
				id: req.verificationId,
			},
			data: {
				attemptCount: {
					increment: 1,
				},
			},
			select: {
				email: true,
				userId: true,
				code: true,
				expireAt: true,
				completedAt: true,
				attemptCount: true,
				maxAttemptCount: true,
			},
		});
		if (!verification) {
			throw new RuntimeError("VERIFICATION_CODE_INVALID");
		}
		if (verification.attemptCount >= verification.maxAttemptCount) {
			throw new RuntimeError("VERIFICATION_CODE_ATTEMPT_LIMIT");
		}
		if (verification.completedAt !== null) {
			throw new RuntimeError("VERIFICATION_CODE_ALREADY_USED");
		}
		if (verification.code !== code) {
			// Same error as above to prevent exploitation
			throw new RuntimeError("VERIFICATION_CODE_INVALID");
		}
		if (verification.expireAt < new Date()) {
			throw new RuntimeError("VERIFICATION_CODE_EXPIRED");
		}

		// Mark as used
		const verificationConfirmation = await tx.emailPasswordlessVerification
			.update({
				where: {
					id: req.verificationId,
					completedAt: null,
				},
				data: {
					completedAt: new Date(),
				},
			});
		if (verificationConfirmation === null) {
			throw new RuntimeError("VERIFICATION_CODE_ALREADY_USED");
		}

		// Get or create user
		if (verification.userId) {
			userId = verification.userId;
		} else {
			const { user } = await ctx.modules.users.createUser({});
			userId = user.id;
		}

		// Create identity
		await tx.emailPasswordless.upsert({
			where: {
				email: verification.email,
				userId,
			},
			create: {
				email: verification.email,
				userId,
			},
			update: {},
		});
	});
	assertExists(userId);

	// Create token
	const { token } = await ctx.modules.users.createUserToken({ userId });

	return { token };
}
