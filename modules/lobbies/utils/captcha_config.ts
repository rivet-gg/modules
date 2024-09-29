import {
	CaptchaProvider,
	Config,
	RateLimitByEndpointId,
	RateLimitConfig,
} from "../config.ts";

export function getCaptchaProvider(config: Config): CaptchaProvider | null {
	if (!config.captcha || !config.captcha.provider) return null;

	return config.captcha.provider;
}

type KnownEndpoint = keyof RateLimitByEndpointId;

const endpointRateLimits: RateLimitByEndpointId = {
	list: {
		period: 20,
		requests: 5,
	},
	create: {
		period: 15,
		requests: 5,
	},
	join: {
		period: 15,
		requests: 8,
	},
	find_or_create: {
		period: 15,
		requests: 8,
	},
	find: {
		period: 15,
		requests: 10,
	},
};

export function getRateLimitConfigByEndpoint(
	config: Config,
	endpoint: KnownEndpoint,
): Readonly<RateLimitConfig> {
	return config.captcha?.endpointRateLimits?.[endpoint] ??
		endpointRateLimits[endpoint];
}
