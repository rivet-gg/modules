import { ScriptContext } from "../module.gen.ts";
import { createVerification } from "../utils/code_management.ts";
import { Verification } from "../utils/types.ts";

export interface Request {
	email: string;
	userToken?: string;
	fromEmail?: string;
	fromName?: string;
}

export interface Response {
	verification: Verification;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({});

	const { code, verification } = await createVerification(
		ctx,
		req.email,
	);

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

	return { verification };
}
