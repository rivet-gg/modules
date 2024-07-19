export enum MessageStatus {
    QUEUED = "queued",
    SENT = "sent",
    FAILED = "failed",
}

export interface Message {
    id: string;

    to: string;
    from: string;
    body: string;
    segments: number;
    price?: [number, string];
    priceUSD?: number;

    status: MessageStatus;
}

export abstract class SmsProvider {
    public abstract send(to: string, content: string, useGSM7: boolean): Promise<Message>;
    public abstract fetch(id: string): Promise<Message>;
}
