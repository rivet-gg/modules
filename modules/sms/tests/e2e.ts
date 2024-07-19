import { test, TestContext } from "../module.gen.ts";
import { assertExists, assertEquals, assertNotEquals, assertGreaterOrEqual } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { MessageStatus } from "../utils/types.ts";

test("Test sms send E2E", async (ctx: TestContext) => {
    const username = faker.internet.userName();
    const fakeCode = faker.random.alphaNumeric(6);

    const line0 = `Hello, ${username}! This is a test message for OpenGB.`;
    const line1 = `Have a cool code: ${fakeCode}!`;
    const messageContent = `${line0}\n${line1}`;

    const phoneNumber = Deno.env.get("TEST_SMS_NUMBER") ?? "+1234567890";

    const initialMessage = await ctx.modules.sms.sendSms({
        content: messageContent,
        to: phoneNumber,
    });
    assertExists(initialMessage);
    assertEquals(initialMessage.body, messageContent);
    assertEquals(initialMessage.to, phoneNumber);

    while (true) {
        const message = await ctx.modules.sms.getMessage({ id: initialMessage.id });
        assertExists(message);
        assertEquals(message.body, initialMessage.body);
        assertEquals(message.id, initialMessage.id);
        assertEquals(message.to, initialMessage.to);

        assertNotEquals(message.status, MessageStatus.FAILED);
        if (message.status === MessageStatus.SENT) break;
    }

    const message = await ctx.modules.sms.getMessage({ id: initialMessage.id });

    if (message.price) {
        assertGreaterOrEqual(message.price[0], 0);
    }
});
