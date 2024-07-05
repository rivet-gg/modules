import { test, TestContext } from "../module.gen.ts";
import { assertExists } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";

test("algorithms", async (ctx: TestContext) => {
    const { user } = await ctx.modules.users.create({
        username: faker.internet.userName(),
    });
    assertExists(user);

    // Set up user
    await ctx.modules.userPasswords.add({ userId: user.id, password: "password" });

    // NOTE: Argon2 is temporarily disabled due to its reliance on `Deno.dlopen`
    // const algorithms = ["argon2", "bcrypt", "scrypt"] as const;
    const algorithms = ["bcrypt", "scrypt"] as const;
    for (const algorithm of algorithms) {
        // Register password
        const password = faker.internet.password();
        await ctx.modules.userPasswords.update({
            userId: user.id,
            newPassword: password,
            newAlgorithm: algorithm,
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
            newAlgorithm: algorithm,
        });

        // Verify new password
        await ctx.modules.userPasswords.verify({
            userId: user.id,
            password: newPass,
        });
    }
});