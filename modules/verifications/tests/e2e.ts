import { test, TestContext, RuntimeError } from "../module.gen.ts";
import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";

test("right_code_first_time", async (ctx: TestContext) => {
	const data = { email: faker.internet.email() };
	const createdVerification = await ctx.modules.verifications.create({ data });
	const attemptResult = await ctx.modules.verifications.attempt({
		token: createdVerification.token,
		code: createdVerification.code,
	});

	assert(attemptResult.succeeded);
	assert(!attemptResult.canTryAgain);
	assertEquals(attemptResult.data, data);
});

test("wrong_code_fail", async (ctx: TestContext) => {
	const data = { email: faker.internet.email() };

	const createdVerification = await ctx.modules.verifications.create({ data });
	const attemptResult = await ctx.modules.verifications.attempt({
		token: createdVerification.token,
		code: "AAAAAAAA",
	});

	assert(!attemptResult.succeeded, "Verification succeeded when it shouldn't have");
	assert(attemptResult.canTryAgain, "Verification should have more than 1 try");
	assertEquals(attemptResult.data, data, "Verification data did not match");
});

test("overattempted", async (ctx: TestContext) => {
	const data = { email: faker.internet.email() };

	const MAX_ATTEMPTS = 5;

	const createdVerification = await ctx.modules.verifications.create({
		data,
		maxAttempts: MAX_ATTEMPTS,
	});

	for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
		const attemptResult = await ctx.modules.verifications.attempt({
			token: createdVerification.token,
			code: "AAAAAAAA",
		});

		assert(!attemptResult.succeeded, "Verification succeeded when it shouldn't have");
		assert(attemptResult.canTryAgain, "Verification ran out of tries earlier than it should have");
		assertEquals(attemptResult.data, data, "Verification data did not match");
	}

	const attemptResult = await ctx.modules.verifications.attempt({
		token: createdVerification.token,
		code: "AAAAAAAA",
	});
	assert(!attemptResult.succeeded, "Verification succeeded when it shouldn't have");
	assert(!attemptResult.canTryAgain, "Verification should be out of tries");
	assertEquals(attemptResult.data, data, "Verification data did not match");


	const err = await assertRejects(() => ctx.modules.verifications.attempt({
		token: createdVerification.token,
		code: "AAAAAAAA",
	}), RuntimeError);

	assertEquals(err.code, "no_verification_found");
});

test("get_all_methods", async (ctx: TestContext) => {
	const data = { email: faker.internet.email() };

	const createdVerification = await ctx.modules.verifications.create({ data });
	const getById = await ctx.modules.verifications.get({
		id: createdVerification.id,
	});
	const getByToken = await ctx.modules.verifications.get({
		token: createdVerification.token,
	});
	const getByData = await ctx.modules.verifications.get({
		data,
	});

	assertEquals(getById, getByToken);
	assertEquals(getByToken, getByData);
});
