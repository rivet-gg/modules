import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { IDENTITY_INFO_PASSWORD } from "../utils/provider.ts";
import { ensureNotAssociatedAll } from "../utils/link_assertions.ts";

export interface Request {
	email: string;
	password: string;

	token: string;
	code: string;
}

export interface Response {
	userToken: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

	// Check the verification code. If it is valid, but for the wrong email, say
	// the verification failed.
	const { data, succeeded } = await ctx.modules.verifications.attempt({ token: req.token, code: req.code });
	if (!succeeded) throw new RuntimeError("invalid_code");

	if (
		typeof data !== "object" ||
		data === null ||
		!("email" in data) ||
		typeof data.email !== "string"
	) throw new RuntimeError("unknown_err");

	if (!compareConstantTime(req.email, data.email)) {
		throw new RuntimeError("verification_failed");
	}

	// Ensure that the email is not associated with ANY accounts in ANY way.
	await ensureNotAssociatedAll(ctx, data.email, new Set());

	// Sign up the user with the passwordless email identity
	const { userToken, userId } = await ctx.modules.identities.signUp({
		info: IDENTITY_INFO_PASSWORD,
		uniqueData: {
			identifier: data.email,
		},
		additionalData: {},
	});

	await ctx.modules.userPasswords.add({ userId, password: req.password });

	return { userToken };
}

function compareConstantTime(aConstant: string, b: string) {
	let isEq = 1;
	for (let i = 0; i < aConstant.length; i++) {
		isEq &= Number(aConstant[i] === b[i]);
	}
	isEq &= Number(aConstant.length === b.length);

	return Boolean(isEq);
}
