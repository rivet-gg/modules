import { test, TestContext } from "../module.gen.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import {
	IDENTITY_INFO_PASSWORDLESS,
} from "../utils/provider.ts";
import { checkLogin, getVerification, verifyProvider } from "./common.ts";

// MARK: Test Email/No Pass
test("create_with_email_and_login_passwordless", async (ctx: TestContext) => {
	const email = faker.internet.email();

	let userToken: string;

	// MARK: Sign Up
	{
		const { token, code } = await getVerification(ctx, { email });
		const signUpRes = await ctx.modules.authEmailPasswordless.verifyLoginOrCreateNoPass({
			token,
			code,
		});
		userToken = signUpRes.userToken;
	}

	const { user } = await ctx.modules.users.authenticateToken({
		userToken,
		fetchUser: true,
	});

	await verifyProvider(ctx, userToken, email, IDENTITY_INFO_PASSWORDLESS);

	// MARK: Log in
	{
		const { token, code } = await getVerification(ctx, { email });

		const { userToken } = await ctx.modules.authEmailPasswordless.verifyLoginOrCreateNoPass(
			{
				token,
				code,
			},
		);

		await checkLogin(ctx, user!, userToken);
	}
});
