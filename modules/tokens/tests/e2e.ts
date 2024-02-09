import { Runtime, Context } from "@ogs/runtime";
import config from "../../../dist/runtime_config.ts";
import { assertEquals, assertExists } from "std/assert/mod.ts";
import { TokenUpdate } from "../scripts/revoke.ts";

Runtime.test(config, "tokens", "e2e", async (ctx: Context) => {
    let { token } = await ctx.call("tokens", "create", {
        type: "test",
        meta: { foo: "bar" },
    }) as any;

    let getRes = await ctx.call("tokens", "get", {
        tokenIds: [token.id],
    }) as any;
    assertExists(getRes.tokens[token.id]);

    let validateRes = await ctx.call("tokens", "validate", {
        tokens: [token.token],
    }) as any;
    assertExists(validateRes.tokens[token.token]);

    let revokeRes = await ctx.call("tokens", "revoke", {
        tokenIds: [token.id],
    }) as any;
    assertEquals(revokeRes.updates[token.id], TokenUpdate.Revoked);

    let getRes2 = await ctx.call("tokens", "get", {
        tokenIds: [token.id],
    }) as any;
    assertExists(getRes2.tokens[token.id].revoked_at);

    let revokeRes2 = await ctx.call("tokens", "revoke", {
        tokenIds: [token.id],
    }) as any;
    assertEquals(revokeRes2.updates[token.id], TokenUpdate.AlreadyRevoked);

    let nonexistentTokenId = crypto.randomUUID();
    let revokeRes3 = await ctx.call("tokens", "revoke", {
        tokenIds: [nonexistentTokenId],
    }) as any;
    assertEquals(revokeRes3.updates[nonexistentTokenId], TokenUpdate.NotFound);
});
