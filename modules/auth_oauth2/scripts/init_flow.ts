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
	urlForLoginLink: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// Max 2 login attempts per IP per minute
	ctx.modules.rateLimit.throttlePublic({ requests: 5, period: 60 });

	const provider = req.providerIdent.provider;

	// Ensure that the provider configurations are valid
	const config = await getFullConfig(ctx.config);
	if (!config) throw new RuntimeError("invalid_config", { statusCode: 500 });

	// Get the OAuth2 Client and generate a unique state string
	const client = getClient(config, provider);
	const state = await tokenToStateStr(config.oauthSecret, req.flowToken);

	// Get the URI to eventually redirect the user to
	const { uri, codeVerifier } = await client.code.getAuthorizationUri({
		state,
	});

	// Add attempt data to the flow token
	const { tokens: [{ meta: oldMeta }] } = await ctx.modules.tokens.fetchByToken(
		{ tokens: [req.flowToken] },
	);
	const newMeta = {
		...oldMeta,
		oauthData: {
			provider,
			state,
			codeVerifier,
		},
	};
	await ctx.modules.tokens.modifyMeta({
		token: req.flowToken,
		newMeta,
	});

	return {
		urlForLoginLink: uri.toString(),
	};
}
