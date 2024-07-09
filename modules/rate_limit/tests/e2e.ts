import { RuntimeError, test, TestContext } from "../module.gen.ts";
import {
	assertEquals,
	assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { delay } from "https://deno.land/std@0.214.0/async/delay.ts";

test("e2e", async (ctx: TestContext) => {
	const testId = crypto.randomUUID();

	const requests = 5;
	const period = 2;

	const makeRequest = async () => {
		await ctx.modules.rateLimit.throttle({
			type: "test",
			key: testId,
			requests,
			period,
		});
	};

	// Exhause rate limit
	for (let i = 0; i < 5; i++) {
		await makeRequest();
	}

	// Should be rate limited for all future requests
	for (let i = 0; i < 3; i++) {
		const error = await assertRejects(() => makeRequest(), RuntimeError);
		assertEquals("RATE_LIMIT_EXCEEDED", error.code);
	}

	// Wait for the rate limit to reset
	await delay(period * 1000);

	// Should be able to make requests again
	await makeRequest();
});
