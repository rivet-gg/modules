import { test, TestContext } from "../module.gen.ts";
import { assertExists, assertEquals, assertRejects } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { RuntimeError } from "../module.gen.ts";

test("accept_matching_password", async (ctx: TestContext) => {
	const { user } = await ctx.modules.users.create({
		username: faker.internet.userName(),
	});
	assertExists(user);

	// Register password
	const password = faker.internet.password();
	await ctx.modules.userPasswords.add({
		userId: user.id,
		password,
	});

	// Verify password
	await ctx.modules.userPasswords.verify({
		userId: user.id,
		password: password,
	});

	// Change password
	const newPass = faker.internet.password();
	await ctx.modules.userPasswords.update({
		userId: user.id,
		newPassword: newPass,
	});

	// Verify new password
	await ctx.modules.userPasswords.verify({
		userId: user.id,
		password: newPass,
	});
});


test("reject_different_password", async (ctx: TestContext) => {
	const { user } = await ctx.modules.users.create({
		username: faker.internet.userName(),
	});
	assertExists(user);

	// Register password
	const password = faker.internet.password();
	await ctx.modules.userPasswords.add({
		userId: user.id,
		password,
	});

	const wrongPassword = faker.internet.password();

	// Verify incorrect password
	const error = await assertRejects(async () => {
		await ctx.modules.userPasswords.verify({
			userId: user.id,
			password: wrongPassword,
		});
	}, RuntimeError);

	// Verify error message
	assertExists(error.message);
	assertEquals(error.code, "password_invalid");
});

test("reject_unregistered", async (ctx: TestContext) => {
	const { user } = await ctx.modules.users.create({
		username: faker.internet.userName(),
	});
	assertExists(user);

	// Register password
	const password = faker.internet.password();
	await ctx.modules.userPasswords.add({
		userId: user.id,
		password,
	});

	const wrongPassword = faker.internet.password();

	// Verify "correct" password with unregistered user
	const error = await assertRejects(async () => {
		await ctx.modules.userPasswords.verify({
			userId: crypto.randomUUID(),
			password: wrongPassword,
		});
	}, RuntimeError);

	// Verify error message
	assertExists(error.message);
	assertEquals(error.code, "user_does_not_have_password");
});
