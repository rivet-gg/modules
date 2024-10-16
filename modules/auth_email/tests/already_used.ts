import { RuntimeError, test, TestContext } from "../module.gen.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { getVerification } from "./common.ts";
import {
	assertEquals,
	assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { checkLogin } from "./common.ts";

async function signUpEmailPass(
	ctx: TestContext,
	email: string,
	password: string,
) {
	const { verificationToken, code } = await getVerification(ctx, email);
	return await ctx.modules.authEmail.verifySignUpEmailPass({
		verificationToken,
		code,

		email,
		password,
	});
}
async function signUpEmailNoPass(ctx: TestContext, email: string) {
	const { verificationToken, code } = await getVerification(ctx, email);
	return await ctx.modules.authEmail.verifyLoginOrCreateNoPass({
		verificationToken,
		code,
	});
}
async function signUpEmailLink(ctx: TestContext, email: string) {
	const { user } = await ctx.modules.users.create({});
	const { token: { token } } = await ctx.modules.users.createToken({
		userId: user.id,
	});

	const { verificationToken, code } = await getVerification(ctx, email);
	await ctx.modules.authEmail.verifyLinkEmail({
		userToken: token,
		verificationToken,
		code,
	});

	return { userToken: token };
}

// MARK: SU Pass then SU No Pass
test("sign_up_with_email_pass_then_no_pass", async (ctx: TestContext) => {
	const email = faker.internet.email();
	const password = faker.internet.password();

	await signUpEmailPass(ctx, email, password);
	{
		const { verificationToken, code } = await getVerification(ctx, email);
		const error = await assertRejects(() => {
			return ctx.modules.authEmail.verifyLoginOrCreateNoPass({
				verificationToken,
				code,
			});
		}, RuntimeError);

		assertEquals(error.code, "email_in_use");
	}
});

// MARK: Link then SU No Pass
test("email_link_then_sign_up_no_pass", async (ctx: TestContext) => {
	const email = faker.internet.email();

	await signUpEmailLink(ctx, email);
	{
		const { verificationToken, code } = await getVerification(ctx, email);
		const error = await assertRejects(() => {
			return ctx.modules.authEmail.verifyLoginOrCreateNoPass({
				verificationToken,
				code,
			});
		}, RuntimeError);

		assertEquals(error.code, "email_in_use");
	}
});

// MARK: SU No Pass then SU Pass
test("sign_up_with_email_no_pass_then_pass", async (ctx: TestContext) => {
	const email = faker.internet.email();
	const password = faker.internet.password();

	await signUpEmailNoPass(ctx, email);
	{
		const { verificationToken, code } = await getVerification(ctx, email);
		const error = await assertRejects(() => {
			return ctx.modules.authEmail.verifySignUpEmailPass({
				verificationToken,
				code,
				email,
				password,
			});
		}, RuntimeError);

		assertEquals(error.code, "email_in_use");
	}
});

// MARK: Link then SU Pass
test("email_link_then_sign_up_pass", async (ctx: TestContext) => {
	const email = faker.internet.email();
	const password = faker.internet.password();

	await signUpEmailLink(ctx, email);
	{
		const { verificationToken, code } = await getVerification(ctx, email);
		const error = await assertRejects(() => {
			return ctx.modules.authEmail.verifySignUpEmailPass({
				verificationToken,
				code,
				email,
				password,
			});
		}, RuntimeError);

		assertEquals(error.code, "email_in_use");
	}
});

// MARK: Link then Add Pass
test("email_link_then_add_pass", async (ctx: TestContext) => {
	const email = faker.internet.email();
	const password = faker.internet.password();

	const { userToken } = await signUpEmailLink(ctx, email);
	const { user } = await ctx.modules.users.authenticateTokenInternal({
		userToken,
		fetchUser: true,
	});
	{
		const { verificationToken, code } = await getVerification(ctx, email);
		await ctx.modules.authEmail.verifyAddEmailPass({
			userToken,
			verificationToken,
			code,
			email,
			password,
			oldPassword: null,
		});
	}

	{
		const { userToken: newUserToken } = await ctx.modules.authEmail
			.signInEmailPass({
				email,
				password,
			});

		await checkLogin(ctx, user!, newUserToken);
	}
});

// MARK: Link then Add No Pass
test("email_link_then_add_no_pass", async (ctx: TestContext) => {
	const email = faker.internet.email();

	const { userToken } = await signUpEmailLink(ctx, email);
	const { user } = await ctx.modules.users.authenticateTokenInternal({
		userToken,
		fetchUser: true,
	});
	{
		const { verificationToken, code } = await getVerification(ctx, email);
		await ctx.modules.authEmail.verifyAddNoPass({
			userToken,
			verificationToken,
			code,
		});
	}

	{
		const { verificationToken, code } = await getVerification(ctx, email);
		const { userToken: newUserToken } = await ctx.modules.authEmail
			.verifyLoginOrCreateNoPass({
				verificationToken,
				code,
			});
		await checkLogin(ctx, user!, newUserToken);
	}
});

// MARK: Link then Pass 2 Users
test("email_link_then_add_pass_on_different_user", async (ctx: TestContext) => {
	const email = faker.internet.email();
	const password = faker.internet.password();

	await signUpEmailLink(ctx, email);

	const { user } = await ctx.modules.users.create({});
	const { token: { token: userToken } } = await ctx.modules.users.createToken({
		userId: user.id,
	});
	{
		const { verificationToken, code } = await getVerification(ctx, email);
		const error = await assertRejects(() => {
			return ctx.modules.authEmail.verifyAddEmailPass({
				userToken,
				verificationToken,
				code,
				email,
				password,
				oldPassword: null,
			});
		}, RuntimeError);

		assertEquals(error.code, "email_in_use");
	}
});

// MARK: Link then Link 2 Users
test("email_link_then_add_pass_on_different_user", async (ctx: TestContext) => {
	const email = faker.internet.email();

	await signUpEmailLink(ctx, email);

	const { user } = await ctx.modules.users.create({});
	const { token: { token: userToken } } = await ctx.modules.users.createToken({
		userId: user.id,
	});
	{
		const { verificationToken, code } = await getVerification(ctx, email);
		const error = await assertRejects(() => {
			return ctx.modules.authEmail.verifyLinkEmail({
				userToken,
				verificationToken,
				code,
			});
		}, RuntimeError);

		assertEquals(error.code, "email_in_use");
	}
});
