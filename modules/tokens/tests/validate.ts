import { TestContext, Runtime, RuntimeError } from "@ogs/runtime";
import config from "../../../dist/runtime_config.ts";
import { fail } from "std/assert/fail.ts";
import { assertEquals, assertRejects, assertThrows } from "std/assert/mod.ts";

Runtime.test(config, "tokens", "validate token not found", async (ctx: TestContext) => {
    const error = await assertRejects(async () => {
        await ctx.call("tokens", "validate", {  token: "invalid token" }) as any;
    }, RuntimeError);
    assertEquals(error.code, "TOKEN_NOT_FOUND");
});

Runtime.test(config, "tokens", "validate token revoked", async (ctx: TestContext) => {
	const { token } = await ctx.call("tokens", "create", {
		type: "test",
		meta: { foo: "bar" },
	}) as any;

    await ctx.call("tokens", "revoke", { tokenIds: [token.id] }) as any;

    const error = await assertRejects(async () => {
        await ctx.call("tokens", "validate", {  token: token.token }) as any;
    }, RuntimeError);
    assertEquals(error.code, "TOKEN_REVOKED");
});

Runtime.test(config, "tokens", "validate token expired", async (ctx: TestContext) => {
	const { token } = await ctx.call("tokens", "create", {
		type: "test",
		meta: { foo: "bar" },
        expire_at: Temporal.Now.plainDateTimeISO().add({ milliseconds: 100 }).toJSON(),
	}) as any;

    // Token should be valid
    let validateRes = await ctx.call("tokens", "validate", {  token: token.token }) as any;
    assertEquals(token.id, validateRes.token.id);

    // Wait for token to expire
    await new Promise((resolve) => setTimeout(resolve, 200))

    const error = await assertRejects(async () => {
        await ctx.call("tokens", "validate", {  token: token.token }) as any;
    }, RuntimeError);
    assertEquals(error.code, "TOKEN_EXPIRED");
});
