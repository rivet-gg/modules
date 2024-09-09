import { Empty, Module, RuntimeError, ScriptContext, UnreachableError } from "../module.gen.ts";
import { ensureNotAssociated, ensureNotAssociatedAll } from "../utils/link_assertions.ts";
import { IDENTITY_INFO_PASSWORD } from "../utils/provider.ts";

interface ConnectRequest {
	connectEmail: {
		userToken: string;
	};
}
interface SignInRequest {
	signIn: {
		createUser: boolean;
	};
}
interface SignUpRequest {
	signUp: Empty;
}
export type Request = { email: string, password: string } & (ConnectRequest | SignInRequest | SignUpRequest);

export interface Response {
	token: string;
}

const HOUR_MS = 60 * 60 * 1000;
const ATTEMPTS = 3;

export async function run(ctx: ScriptContext, req: Request): Promise<Response> {
	let verificationData: unknown;
	if ("connectEmail" in req) {
		const { userId } = await ctx.modules.users.authenticateToken({
			userToken: req.connectEmail.userToken,
		});

		if (await ctx.modules.userPasswords.meta({ userId })) {
			await ctx.modules.userPasswords.verify({ userId, password: req.password });
			await ensureNotAssociatedAll(ctx, req.email, new Set());
			verificationData = { email: req.email, connect: userId, createdAt: new Date().toISOString() };
		} else {
			const newHash = Module.userPasswords.prehash(req.password);
			verificationData = { email: req.email, newHash, connect: userId };
		}
	} else if ("signIn" in req) {
		try {
			const { userId } = await ctx.modules.identities.signIn({
				info: IDENTITY_INFO_PASSWORD,
				uniqueData: { identifier: req.email },
			});

			await ctx.modules.userPasswords.verify({ userId, password: req.password });

			verificationData = { email: req.email, signIn: userId, createdAt: new Date().toISOString() };
		} catch (e) {
			if (!(e instanceof RuntimeError) || e.code !== "identity_provider_not_found") {
				throw e;
			}
			if (!req.signIn.createUser) throw new RuntimeError("email_unregistered");

			await ensureNotAssociatedAll(ctx, req.email, new Set());
			const newHash = Module.userPasswords.prehash(req.password);
			verificationData = { email: req.email, signUp: true, newHash };
		}
	} else if ("signUp" in req) {
		await ensureNotAssociatedAll(ctx, req.email, new Set());
		const newHash = Module.userPasswords.prehash(req.password);
		verificationData = { email: req.email, signUp: true, newHash };
	} else {
		throw new UnreachableError(req);
	}

	const { token } = await ctx.modules.verifications.create({
		data: verificationData,
		expireAt: new Date(Date.now() + HOUR_MS).toISOString(),
		maxAttempts: ATTEMPTS,
	});

	return { token };
}
