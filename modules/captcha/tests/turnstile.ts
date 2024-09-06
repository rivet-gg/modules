import { test, TestContext } from "../module.gen.ts";
import { assertEquals } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { validateCFTurnstileResponse } from "../providers/turnstile.ts";

test(
	"turnstile success and failure",
	async (ctx: TestContext) => {
        // Always passes
        const shouldBeTrue = await validateCFTurnstileResponse(
            "1x0000000000000000000000000000000AA",
            "lorem"
        );

        assertEquals(shouldBeTrue, true);

        // Always fails
        const shouldBeFalse = await validateCFTurnstileResponse(
            "2x0000000000000000000000000000000AA",
            "ipsum"
        );

        assertEquals(shouldBeFalse, false);
	},
);
