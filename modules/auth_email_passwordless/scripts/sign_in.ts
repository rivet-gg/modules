import { Empty, RuntimeError, ScriptContext, UnreachableError } from "../module.gen.ts";
import { ensureNotAssociatedAll } from "../utils/link_assertions.ts";
import { IDENTITY_INFO_PASSWORDLESS } from "../utils/provider.ts";

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
export type Request = { email: string } & (ConnectRequest | SignInRequest | SignUpRequest);

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
		await ensureNotAssociatedAll(ctx, req.email, new Set());
		verificationData = { email: req.email, connect: userId };
	} else if ("signIn" in req) {
		if (ctx.config.mode !== "login") throw new RuntimeError("not_enabled");
		try {
			const { userId } = await ctx.modules.identities.signIn({
				info: IDENTITY_INFO_PASSWORDLESS,
				uniqueData: { identifier: req.email },
			});

			verificationData = { email: req.email, signIn: userId };
		} catch (e) {
			if (!(e instanceof RuntimeError) || e.code !== "identity_provider_not_found") {
				throw e;
			}
			if (!req.signIn.createUser) throw new RuntimeError("email_unregistered");

			await ensureNotAssociatedAll(ctx, req.email, new Set());
			verificationData = { email: req.email, signUp: true };
		}
	} else if ("signUp" in req) {
		if (ctx.config.mode !== "login") throw new RuntimeError("not_enabled");
		await ensureNotAssociatedAll(ctx, req.email, new Set());
		verificationData = { email: req.email, signUp: true };
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
