import { RuntimeError, test, TestContext } from "../module.gen.ts";
import {
	assertEquals,
	assertRejects,
} from "https://deno.land/std@0.217.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";

test(
	"get balance for nonexistent user",
	async (ctx: TestContext) => {
		const { balance } = await ctx.modules.currency.fetchBalance({
			userId: "00000000-0000-0000-0000-000000000000",
		});

		assertEquals(balance, 0);
	},
);

test(
	"withdraw more than balance",
	async (ctx: TestContext) => {
		const { user: user } = await ctx.modules.users.create({
			username: faker.internet.userName(),
		});

		const { updatedBalance: _ } = await ctx.modules.currency.adjustBalance({
			userId: user.id,
			amount: 100,
		});

		const error = await assertRejects(async () => {
			await ctx.modules.currency.adjustBalance({
				userId: user.id,
				amount: -150,
			});
		}, RuntimeError);
		assertEquals(error.code, "not_enough_funds");
	},
);

test(
	"adjust NaN",
	async (ctx: TestContext) => {
		const { user: user } = await ctx.modules.users.create({
			username: faker.internet.userName(),
		});

		const error = await assertRejects(async () => {
			await ctx.modules.currency.adjustBalance({
				userId: user.id,
				amount: NaN,
			});
		}, RuntimeError);
		assertEquals(error.code, "invalid_amount");
	},
);

test(
	"adjust Infinity",
	async (ctx: TestContext) => {
		const { user: user } = await ctx.modules.users.create({
			username: faker.internet.userName(),
		});

		const error = await assertRejects(async () => {
			await ctx.modules.currency.adjustBalance({
				userId: user.id,
				amount: Infinity,
			});
		}, RuntimeError);
		assertEquals(error.code, "invalid_amount");
	},
);

test(
	"set balance to negative",
	async (ctx: TestContext) => {
		const { user: user } = await ctx.modules.users.create({
			username: faker.internet.userName(),
		});

		const error = await assertRejects(async () => {
			await ctx.modules.currency.setBalance({ userId: user.id, balance: -1 });
		}, RuntimeError);
		assertEquals(error.code, "invalid_amount");
	},
);

test(
	"set balance to NaN",
	async (ctx: TestContext) => {
		const { user: user } = await ctx.modules.users.create({
			username: faker.internet.userName(),
		});

		const error = await assertRejects(async () => {
			await ctx.modules.currency.setBalance({ userId: user.id, balance: NaN });
		}, RuntimeError);
		assertEquals(error.code, "invalid_amount");
	},
);

// Is this too restrictive of a test?
test(
	"set balance to infinity",
	async (ctx: TestContext) => {
		const { user: user } = await ctx.modules.users.create({
			username: faker.internet.userName(),
		});

		const error = await assertRejects(async () => {
			await ctx.modules.currency.setBalance({
				userId: user.id,
				balance: Infinity,
			});
		}, RuntimeError);
		assertEquals(error.code, "invalid_amount");
	},
);
