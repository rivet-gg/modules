import { assertExists } from "https://deno.land/std@0.208.0/assert/assert_exists.ts";
import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { ProviderSendGrid } from "../config.ts";
import { Email } from "../utils/types.ts";

export interface Request {
	from: Email;
	to: Email[];
	cc?: Email[];
	bcc?: Email[];
	replyTo?: Email[];
	subject: string;
	html?: string;
	text?: string;
}

export type Response = Record<never, never>;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	if (!req.html && !req.text) {
		throw new RuntimeError("email_missing_content");
	}

	if ("test" in ctx.config.provider) {
		// Do nothing
	} else if ("sendGrid" in ctx.config.provider) {
		await useSendGrid(ctx.config.provider.sendGrid, req);
	} else {
		throw new RuntimeError("unreachable");
	}

	return {};
}

async function useSendGrid(config: ProviderSendGrid, req: Request) {
	const apiKeyVariable = config.apiKeyVariable ?? "SENDGRID_API_KEY";
	const apiKey = Deno.env.get(apiKeyVariable);
	assertExists(apiKey, `Missing environment variable: ${apiKeyVariable}`);

	const content = [];
	if (req.text) {
		content.push({ type: "text/plain", value: req.text });
	}
	if (req.html) {
		content.push({ type: "text/html", value: req.html });
	}

	const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			personalizations: [{
				to: req.to.map(({ email, name }) => ({ email, name })),
				cc: req.cc?.map(({ email, name }) => ({ email, name })),
				bcc: req.bcc?.map(({ email, name }) => ({ email, name })),
			}],
			from: { email: req.from.email, name: req.from.name },
			reply_to_list: req.replyTo?.map(({ email, name }) => ({ email, name })),
			subject: req.subject,
			content: [
				{ type: "text/plain", value: req.text },
				{ type: "text/html", value: req.html },
			],
		}),
	});
	if (!response.ok) {
		throw new RuntimeError("SENDGRID_ERROR", {
			meta: {
				status: response.status,
				text: await response.text(),
			},
		});
	}
}
