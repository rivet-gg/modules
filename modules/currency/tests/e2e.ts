import { test, TestContext } from "../module.gen.ts";
import { assertEquals } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";

test(
	"e2e transaction",
	async (ctx: TestContext) => {
		const { user: user } = await ctx.modules.users.create({
			username: faker.internet.userName(),
		});
		const { token } = await ctx.modules.users.createToken({
			userId: user.id,
		});

		const { updatedBalance } = await ctx.modules.currency.adjustBalance({
			userId: user.id,
			amount: 100,
		});

		assertEquals(updatedBalance, 100);

		const { balance: initialBalance } = await ctx.modules.currency.fetchBalance({
			userId: user.id,
		});

		assertEquals(initialBalance, 100);

		const { updatedBalance: withdraw } = await ctx.modules.currency.adjustBalance({
			userId: user.id,
			amount: -50,
		});

		assertEquals(withdraw, 50);

		const { balance: postWithdrawGetBalance } = await ctx.modules.currency
			.fetchBalance({
				userId: user.id,
			});

		assertEquals(postWithdrawGetBalance, 50);

		const { balance } = await ctx.modules.currency.fetchBalanceByToken({
			userToken: token.token,
		});

		assertEquals(balance, 50);

		// Validate that getting the balance by id and token returns the same thing
		assertEquals(postWithdrawGetBalance, balance);

		// set bal to 0
		await ctx.modules.currency.setBalance({
			userId: user.id,
			balance: 0,
		});

		const { balance: finalBalance } = await ctx.modules.currency.fetchBalance({
			userId: user.id,
		});

		assertEquals(finalBalance, 0);

		const { balance: finalBalanceByToken } = await ctx.modules.currency
			.fetchBalanceByToken({
				userToken: token.token,
			});

		assertEquals(finalBalanceByToken, 0);
	},
);
