import { test, TestContext } from "../module.gen.ts";
import { assertExists, assertEquals, assertRejects } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { RuntimeError } from "../module.gen.ts";

test("test_sign_up", async (ctx: TestContext) => {
	const username = faker.internet.userName();
	const password = faker.internet.password();

	// MARK: Should be able to sign up and things should match
	const { token } = await ctx.modules.authUsernamePassword.signUp({
		username,
		password,
	});

	const { userId } = await ctx.modules.users.authenticateTokenInternal({
		userToken: token.token,
	});


	const { users: [user] } = await ctx.modules.users.fetchByUsername({
		usernames: [username],
	});

	assertExists(user);
	assertEquals(user.id, userId);

	// MARK: Should not be able to sign up with the same username
	const error = await assertRejects(async () => {
		await ctx.modules.authUsernamePassword.signUp({
			username,
			password,
		});
	}, RuntimeError);
	assertEquals(error.code, "user_already_exists");
});

test("test_sign_in", async (ctx: TestContext) => {
	const username = faker.internet.userName();
	const password = faker.internet.password();

	// MARK: Sign up
	await ctx.modules.authUsernamePassword.signUp({
		username,
		password,
	});

	// MARK: Can sign in with correct credentials
	const { token } = await ctx.modules.authUsernamePassword.signIn({
		username,
		password,
	});

	const { userId } = await ctx.modules.users.authenticateTokenInternal({
		userToken: token.token,
	});

	const { users: [user] } = await ctx.modules.users.fetchByUsername({
		usernames: [username],
	});

	assertExists(user);
	assertEquals(user.id, userId);
	assertEquals(user.username, username);

	// MARK: Can't sign in with wrong password
	const error = await assertRejects(async () => {
		await ctx.modules.authUsernamePassword.signIn({
			username,
			password: faker.internet.password(),
		});
	}, RuntimeError);
	assertEquals(error.code, "invalid_username_or_password");
});

