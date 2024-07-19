import { Empty } from "../../module.gen.ts";
import { Message, MessageStatus, SmsProvider } from "./index.ts";

export type TestConfig = Empty;

export class TestProvider extends SmsProvider {
    protected config: TestConfig;

    public constructor(config: TestConfig) {
        super();

        this.config = config;
    }

    public async send(to: string, body: string): Promise<Message> {
        const isGSM7 = body.match(/^[A-Za-z0-9\+\/\=]*$/);
        const gsm7Segments = Math.ceil(body.length / 160);
        const unicodeSegments = Math.ceil(body.length / 70);
        const segments = isGSM7 ? gsm7Segments : unicodeSegments;
        const from = "+1 (000) 000-0000";

        // Encode the metadata into the ID so we can pull it out later
        const id = btoa(JSON.stringify({
            to,
            from,
            segments,
            body,
            date: new Date().toISOString(),
        }));

        return await Promise.resolve<Message>({
            id,
            from,
            to,
            status: MessageStatus.SENT,
            segments,
            body,
            price: [0, "usd"],
            priceUSD: 0,
        });
    }

    public async fetch(id: string): Promise<Message> {
        const metadata = JSON.parse(atob(id));

        return await Promise.resolve<Message>({
            id,
            from: metadata.from,
            to: metadata.to,
            segments: metadata.segments,
            status: MessageStatus.SENT,
            body: metadata.body,
            price: [0, "usd"],
            priceUSD: 0,
        });
    }
}
