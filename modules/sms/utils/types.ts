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
