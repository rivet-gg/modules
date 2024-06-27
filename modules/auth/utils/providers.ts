import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { completeFlow } from "./flow.ts";
import { OAuthProvider, Provider, ProviderType } from "./types.ts";

function getAuthProviderType(provider: Provider): ProviderType {
	if (ProviderType.EMAIL in provider) {
		return ProviderType.EMAIL;
	} else if (ProviderType.OAUTH in provider) {
		console.log("Provider is oauth:", provider);
		return ProviderType.OAUTH;
	} else {
		throw new RuntimeError("invalid_provider");
	}
}

export async function initFlowWithProvider(
	ctx: ScriptContext,
	flowToken: string,
	provider: Provider,
): Promise<string> {
	switch (getAuthProviderType(provider)) {
		case ProviderType.EMAIL:
			throw new Error("todo");

		case ProviderType.OAUTH: {
			const { urlForLoginLink } = await ctx.modules.authOauth2.initFlow({
				flowToken,
				providerIdent: (provider as OAuthProvider).oauth,
			});
			return urlForLoginLink;
		}
	}
}

export async function pollProvider(
	ctx: ScriptContext,
	flowToken: string,
	provider: Provider,
): Promise<string | null> {
	switch (getAuthProviderType(provider)) {
		case ProviderType.EMAIL:
			throw new Error("todo");

		case ProviderType.OAUTH: {
			const { details } = await ctx.modules.authOauth2.getLoginData({
				flowToken,
				providerIdent: (provider as OAuthProvider).oauth,
			});
			if (!details) return null;

			const identity = await ctx.db.identityOAuth.findFirst({
				where: {
					subId: details.sub,
					provider: details.provider,
				},
			});
			if (!identity) throw new Error("todo");

			const userToken = await completeFlow(
				ctx,
				flowToken,
				identity.userId,
				details.retainedTokenDetails,
			);

			return userToken;
		}
	}
}
