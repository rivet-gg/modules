import { Runtime, Context } from "@ogs/runtime";
import config from "../../../dist/runtime_config.ts";

Runtime.test(config, "tokens", "e2e", async (ctx: Context) => {
    let { token } = await ctx.call("tokens", "create", {
        type: "test",
        meta: { foo: "bar" },
    }) as any;

    let { token: validatedToken } = await ctx.call("tokens", "validate", {
        tokens: [token.token],
    }) as any;
});
