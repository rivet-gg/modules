import { TestConfig } from "./utils/providers/test.ts";
import { TwilioConfig } from "./utils/providers/twilio.ts";

export interface Config {
	provider: Provider;
	convertCurrencyTo?: string;
}

export type Provider = { test: TestConfig } | { twilio: TwilioConfig };
