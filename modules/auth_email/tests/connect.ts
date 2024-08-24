import { test, TestContext } from "../module.gen.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import {
	IDENTITY_INFO_LINK,
	IDENTITY_INFO_PASSWORD,
	IDENTITY_INFO_PASSWORDLESS,
} from "../utils/provider.ts";
import { checkLogin, getVerification, verifyProvider } from "../utils/tests.ts";

// MARK: Test Email/No Pass
test("connect_email_and_login_passwordless", async (ctx: TestContext) => {
	const email = faker.internet.email();

	const { user } = await ctx.modules.users.create({});
	const { token: { token: userToken } } = await ctx.modules.users.createToken({
		userId: user.id,
	});

	// MARK: Connect
	{
		const { verificationToken, code } = await getVerification(ctx, email);
		await ctx.modules.authEmail.verifyAddNoPass({
			userToken,
			verificationToken,
			code,
		});
	}

	await verifyProvider(ctx, userToken, email, IDENTITY_INFO_PASSWORDLESS);

	// MARK: Log in
	{
		const { verificationToken, code } = await getVerification(ctx, email);

		const { userToken } = await ctx.modules.authEmail.verifyLoginOrCreateNoPass(
			{
				verificationToken,
				code,
			},
		);

		await checkLogin(ctx, user, userToken);
	}
});

// MARK: Test Email/Pass
test("connect_email_and_login_password", async (ctx: TestContext) => {
	const email = faker.internet.email();
	const password = faker.internet.password();

	const { user } = await ctx.modules.users.create({});
	const { token: { token: userToken } } = await ctx.modules.users.createToken({
		userId: user.id,
	});

	// MARK: Connect
	{
		const { verificationToken, code } = await getVerification(ctx, email);

		// Now by verifying the email, we register, and can also use
		// this to verify the token
		await ctx.modules.authEmail.verifyAddEmailPass({
			userToken,
			verificationToken,
			code,

			email,
			password,
			oldPassword: null,
		});
	}

	await verifyProvider(ctx, userToken, email, IDENTITY_INFO_PASSWORD);

	// MARK: Log in
	{
		const { userToken } = await ctx.modules.authEmail.signInEmailPass({
			email,
			password,
		});

		await checkLogin(ctx, user, userToken);
	}
});

// MARK: Test Link Email
test("connect_email_link", async (ctx: TestContext) => {
	const email = faker.internet.email();

	const { user } = await ctx.modules.users.create({});
	const { token: { token: userToken } } = await ctx.modules.users.createToken({
		userId: user.id,
	});

	// MARK: Connect
	{
		const { verificationToken, code } = await getVerification(ctx, email);

		// Link the email to the user as a non-sign-in method
		await ctx.modules.authEmail.verifyLinkEmail({
			userToken,
			verificationToken,
			code,
		});
	}

	await verifyProvider(ctx, userToken, email, IDENTITY_INFO_LINK);
});
