import { Empty, RuntimeError, ScriptContext } from "../module.gen.ts";
import { verifyCode } from "../utils/code_management.ts";
import { IDENTITY_INFO_PASSWORD } from "../utils/provider.ts";
import { ensureNotAssociatedAll } from "../utils/link_assertions.ts";

export interface Request {
	userToken: string;

	email: string;
	password: string;
	oldPassword: string | null;

	verificationToken: string;
	code: string;
}

export type Response = Empty;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

	// Check the verification code. If it is valid, but for the wrong email, say
	// the verification failed.
	const { email } = await verifyCode(ctx, req.verificationToken, req.code);
	if (!compareConstantTime(req.email, email)) {
		throw new RuntimeError("verification_failed");
	}

	// Ensure that the email is not associated with ANY accounts in ANY way.
	const providedUser = await ctx.modules.users.authenticateTokenInternal({
		userToken: req.userToken,
	});
	await ensureNotAssociatedAll(ctx, email, new Set([providedUser.userId]));

	// If an old password was provided, ensure it was correct and update it.
	// If one was not, register the user with the `userPasswords` module.
	if (req.oldPassword) {
		await ctx.modules.userPasswords.verify({
			userId: providedUser.userId,
			password: req.oldPassword,
		});
		await ctx.modules.userPasswords.update({
			userId: providedUser.userId,
			newPassword: req.password,
		});
	} else {
		await ctx.modules.userPasswords.add({
			userId: providedUser.userId,
			password: req.password,
		});
	}

	// Sign up the user with the passwordless email identity
	await ctx.modules.identities.link({
		userToken: req.userToken,
		info: IDENTITY_INFO_PASSWORD,
		uniqueData: {
			identifier: email,
		},
		additionalData: {},
	});

	return {};
}

function compareConstantTime(aConstant: string, b: string) {
	let isEq = 1;
	for (let i = 0; i < aConstant.length; i++) {
		isEq &= Number(aConstant[i] === b[i]);
	}
	isEq &= Number(aConstant.length === b.length);

	return Boolean(isEq);
}
