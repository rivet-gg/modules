import { test, TestContext } from "../module.gen.ts";
import { assertEquals } from "https://deno.land/std@0.217.0/assert/mod.ts";

const didFail = async (x: () => Promise<void>) => {
    try {
        await x();
        return false
    } catch {
        return true;
    }
}

test("e2e success and failure", async (ctx: TestContext) => {
    const PERIOD = 5000;
    const REQUESTS = 5;

    const captchaProvider = {
        turnstile: {
            secret: "0x0000000000000000000000000000000000000000",
            sitekey: "" // doesn't really matter here
        }
    }

    assertEquals(false, await didFail(async () => {
        for (let i = 0; i < REQUESTS; ++i) {
            await ctx.modules.captcha.guard({
                type: "ip",
                key: "aaaa",
                requests: REQUESTS,
                period: PERIOD,
                captchaProvider
            });
        }
    }));

    assertEquals(true, await didFail(async () => {
        await ctx.modules.captcha.guard({
            type: "ip",
            key: "aaaa",
            requests: REQUESTS,
            period: PERIOD,
            captchaProvider
        });
    }));
});