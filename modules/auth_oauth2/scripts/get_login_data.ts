import { RuntimeError, ScriptContext } from "../module.gen.ts";

import { getFullConfig } from "../utils/env.ts";
import { getClient } from "../utils/client.ts";

import { ProviderIdentifierDetails } from "../utils/types.ts";
import { tokenToStateStr } from "../utils/state.ts";

export interface Request {
	flowToken: string;
	providerIdent: ProviderIdentifierDetails;
}
export interface Response {
	details: {
		provider: string;
		sub: string;

		retainedTokenDetails: unknown;
	} | null;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// Max 2 login attempts per IP per minute
	// ctx.modules.rateLimit.throttlePublic({ requests: 5, period: 60 });

	// Add attempt data to the flow token
	const { tokens: [{ meta: { oauth } }] } = await ctx.modules.tokens
		.fetchByToken({ tokens: [req.flowToken] });
	if (!oauth) return { details: null };

	const details = {
		provider: req.providerIdent.provider,
		sub: oauth.sub,
		retainedTokenDetails: oauth,
	};

	return { details };
}
