import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { Message } from "../utils/types.ts";
import { TestProvider } from "../utils/providers/test.ts";
import { TwilioProvider } from "../utils/providers/twilio.ts";
import { SmsProvider } from "../utils/providers/index.ts";

export interface Request {
	to: string;
	content: string;
	useGSM7?: boolean;
}

export type Response = Message;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	let provider: SmsProvider;
	if ("test" in ctx.config.provider) {
		provider = new TestProvider(ctx.config.provider.test);
	} else if ("twilio" in ctx.config.provider) {
		provider = new TwilioProvider(ctx.config.provider.twilio);
	} else {
		throw new RuntimeError("unreachable");
	}

	return await provider.send(req.to, req.content, req.useGSM7 ?? false);
}
