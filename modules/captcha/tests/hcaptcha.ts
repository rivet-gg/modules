import { test, TestContext } from "../module.gen.ts";
import { assertEquals } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { validateHCaptchaResponse } from "../providers/hcaptcha.ts";

test(
	"hcaptcha success and failure",
	async (ctx: TestContext) => {
        // Always passes
        const shouldBeTrue = await validateHCaptchaResponse(
            "0x0000000000000000000000000000000000000000",
            "10000000-aaaa-bbbb-cccc-000000000001"
        );

        assertEquals(shouldBeTrue, true);

        // Always fails
        const shouldBeFalse = await validateHCaptchaResponse(
            "0x0000000000000000000000000000000000000000",
            "lorem"
        );

        assertEquals(shouldBeFalse, false);
	},
);
