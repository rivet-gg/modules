import { test, TestContext } from "../module.gen.ts";
import { assertExists, assertEquals } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";

// deno-lint-ignore no-explicit-any
export async function signUpWithTest(ctx: TestContext, username: string, uniqueData: any, additionalData: any) {
    const { userToken } = await ctx.modules.identities.signUp({
        info: {
            identityType: "test",
            identityId: "test",
        },
        username,
        uniqueData,
        additionalData,
    });

    const { userId, user } = await ctx.modules.users.authenticateTokenInternal({
        userToken,
        fetchUser: true,
    });
    assertExists(user);
    assertEquals(user.username, username);

    return { userToken, userId, user };
}

// deno-lint-ignore no-explicit-any
export async function signInWithTest(ctx: TestContext, uniqueData: any) {
    const { userToken } = await ctx.modules.identities.signIn({
        info: {
            identityType: "test",
            identityId: "test",
        },
        uniqueData,
    });

    const { userId, user } = await ctx.modules.users.authenticateTokenInternal({
        userToken,
        fetchUser: true,
    });
    assertExists(user);

    return { userToken, userId, user };
}

test("Sign Up and Sign In", async (ctx: TestContext) => {
    const username = faker.internet.userName();

    const uniqueData = { unique: faker.random.alphaNumeric(10) };
    const additionalData = { additional: faker.random.alphaNumeric(100) };

    const signUpRes = await signUpWithTest(
        ctx,
        username,
        uniqueData,
        additionalData,
    );

    // Validate the identity data
    {
        const { data } = await ctx.modules.identities.fetch({
            userToken: signUpRes.userToken,
            info: {
                identityType: "test",
                identityId: "test",
            },
        });
        assertExists(data);
        assertEquals(data.uniqueData, uniqueData);
        assertEquals(data.additionalData, additionalData);
    }

    // Sign in with the same identity and verify that the user is the same
    const signInRes = await signInWithTest(ctx, uniqueData);
    assertEquals(signUpRes.userId, signInRes.userId);
    assertEquals(signUpRes.user, signInRes.user);
});
