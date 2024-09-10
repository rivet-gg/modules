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

test(
	"hcaptcha success and failure",
	async (ctx: TestContext) => {
        const shouldBeFalse = await didFail(async () => {
            await ctx.modules.captcha.verifyCaptchaToken({
                provider: {
                    hcaptcha: {
                        secret: "0x0000000000000000000000000000000000000000",
                        sitekey: "" // doesn't really matter here
                    }
                },
                token: "10000000-aaaa-bbbb-cccc-000000000001"
            });
        });
        assertEquals(shouldBeFalse, false);

        const shouldBeTrue = await didFail(async () => {
            await ctx.modules.captcha.verifyCaptchaToken({
                provider: {
                    hcaptcha: {
                        secret: "0x0000000000000000000000000000000000000000",
                        sitekey: "" // doesn't really matter here
                    }
                },
                token: "lorem"
            });
        });
        assertEquals(shouldBeTrue, true);
	},
);

test(
	"turnstile success and failure",
	async (ctx: TestContext) => {
        // Always passes
        const shouldBeTrue = await didFail(async () => {
            await ctx.modules.captcha.verifyCaptchaToken({
                provider: {
                    turnstile: {
                        secret: "2x0000000000000000000000000000000AA",
                        sitekey: ""  // doesn't really matter here
                    }
                },
                token: "lorem"
            });
        });
        assertEquals(shouldBeTrue, true);

        // Always fails
        const shouldBeFalse = await didFail(async () => {
            await ctx.modules.captcha.verifyCaptchaToken({
                provider: {
                    turnstile: {
                        secret: "1x0000000000000000000000000000000AA",
                        sitekey: ""  // doesn't really matter here
                    }
                },
                token: "ipsum"
            });
        });
        assertEquals(shouldBeFalse, false);
	},
);
