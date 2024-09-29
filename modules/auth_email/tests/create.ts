import { test, TestContext } from "../module.gen.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import {
	IDENTITY_INFO_PASSWORD,
	IDENTITY_INFO_PASSWORDLESS,
} from "../utils/provider.ts";
import { checkLogin, getVerification, verifyProvider } from "./common.ts";

// MARK: Test Email/No Pass
test("create_with_email_and_login_passwordless", async (ctx: TestContext) => {
	const email = faker.internet.email();

	let userToken: string;

	// MARK: Sign Up
	{
		const { verificationToken, code } = await getVerification(ctx, email);
		const signUpRes = await ctx.modules.authEmail.verifyLoginOrCreateNoPass({
			verificationToken,
			code,
		});
		userToken = signUpRes.userToken;
	}

	const { user } = await ctx.modules.users.authenticateTokenInternal({
		userToken,
		fetchUser: true,
	});

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

		await checkLogin(ctx, user!, userToken);
	}
});

// MARK: Test Email/Pass
test("create_with_email_and_login_password", async (ctx: TestContext) => {
	const email = faker.internet.email();
	const password = faker.internet.password();

	let userToken: string;

	// MARK: Sign Up
	{
		const { verificationToken, code } = await getVerification(ctx, email);
		const signUpRes = await ctx.modules.authEmail.verifySignUpEmailPass({
			verificationToken,
			code,

			email,
			password,
		});

		userToken = signUpRes.userToken;
	}

	const { user } = await ctx.modules.users.authenticateTokenInternal({
		userToken,
		fetchUser: true,
	});

	await verifyProvider(ctx, userToken, email, IDENTITY_INFO_PASSWORD);

	// MARK: Log in
	{
		const { userToken } = await ctx.modules.authEmail.signInEmailPass({
			email,
			password,
		});

		await checkLogin(ctx, user!, userToken);
	}
});
