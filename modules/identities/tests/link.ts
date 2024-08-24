import { test, TestContext } from "../module.gen.ts";
import { assertExists, assertEquals } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { signInWithTest, signUpWithTest } from "./sign_up.ts";

test("Link a new identity to an existing user", async (ctx: TestContext) => {
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


    // Link a new identity to the existing user
    const newUniqueData = { unique: faker.random.alphaNumeric(10) };
    const newAdditionalData = { additional: faker.random.alphaNumeric(100) };
    await ctx.modules.identities.link({
        userToken: signUpRes.userToken,
        info: {
            identityType: "test2",
            identityId: "test2",
        },
        uniqueData: newUniqueData,
        additionalData: newAdditionalData,
    });

    // Validate the new identity data
    {
        const { data } = await ctx.modules.identities.fetch({
            userToken: signUpRes.userToken,
            info: {
                identityType: "test2",
                identityId: "test2",
            },
        });
        assertExists(data);
        assertEquals(data.uniqueData, newUniqueData);
        assertEquals(data.additionalData, newAdditionalData);
    }

    // List all identity providers and verify that both are present and both match
    const { identityProviders } = await ctx.modules.identities.list({ userToken: signUpRes.userToken });

    assertEquals(identityProviders.length, 2);
    const [first, second] = identityProviders;
    const [test, test2] = [first, second].sort((a, b) => a.identityType.localeCompare(b.identityType));

    assertEquals(test, { identityId: "test", identityType: "test" });
    assertEquals(test2, { identityId: "test2", identityType: "test2" });
});
