import { ScriptContext } from "../module.gen.ts";
import { Verification } from "../utils/types.ts";

export interface Request {
	email: string;
	userToken?: string;
}

export interface Response {
	token: string;
}

const HOUR_MS = 60 * 60 * 1000 * 1000;
const ATTEMPTS = 3;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

	const { code, token } = await ctx.modules.verifications.create({
		data: { email: req.email },
		expireAt: new Date(Date.now() + HOUR_MS).toISOString(),
		maxAttempts: ATTEMPTS,
	});

	// Send email
	await ctx.modules.email.sendEmail({
		from: {
			email: ctx.config.fromEmail ?? "hello@test.com",
			name: ctx.config.fromName ?? "Authentication Code",
		},
		to: [{ email: req.email }],
		subject: "Your verification code",
		text: `Your verification code is: ${code}`,
		html: `Your verification code is: <b>${code}</b>`,
	});

	return { token };
}
