import { RuntimeError } from "../../module.gen.ts";
import { Message, MessageStatus, SmsProvider } from "./index.ts";

export interface TwilioConfig {
    accountSID?: string;
    authToken?: string;
    from?: string;
    useGSM7?: boolean;
}
interface FullTwilioConfig {
    accountSID: string;
    authToken: string;
    from: string;
    useGSM7: boolean;
}

export class TwilioProvider extends SmsProvider {
    protected config: FullTwilioConfig;

    public constructor(config: TwilioConfig) {
        super();

        const from = config.from ?? Deno.env.get("SMS_TWILIO_FROM");
        const accountSID = config.accountSID ?? Deno.env.get("SMS_TWILIO_ACCOUNT_SID");
        const authToken = config.authToken ?? Deno.env.get("SMS_TWILIO_AUTH_TOKEN");

        if (!from) throw new RuntimeError("twilio_error", { cause: "from" });
        if (!accountSID) throw new RuntimeError("twilio_error", { cause: "accountSID" });
        if (!authToken) throw new RuntimeError("twilio_error", { cause: "authToken" });

        this.config = {
            accountSID,
            authToken,
            from,
            useGSM7: config.useGSM7 ?? false,
        };
    }

    public async send(to: string, content: string, useGSM7?: boolean): Promise<Message> {
        const willUseGSM7 = useGSM7 ?? this.config.useGSM7;

        const body = new URLSearchParams({
            "To": to,
            "From": this.config.from,
            "Body": content,
            "SmartEncoded": willUseGSM7 ? "true" : "false",
        });

        const data = await this.makeRequest(this.sendURL, "POST", body);
        return this.handleResponse(data);
    }

    public async fetch(sid: string): Promise<Message> {
        const data = await this.makeRequest(this.fetchURL(sid), "GET");
        return this.handleResponse(data);
    }

    private async makeRequest(url: URL, method: string, body?: BodyInit): Promise<unknown> {
        const response = await fetch(url, {
            method,
            headers: {
                "Authorization": this.authHeader,
            },
            body,
        });

        if (!response.ok) {
            throw new RuntimeError(
                "twilio_error",
                {
                    statusCode: response.status,
                    cause: "twilio",
                    // cause: await response.json(),
                },
            );
        }

        let data: unknown;
        try {
            data = await response.json();
        } catch {
            throw new RuntimeError(
                "twilio_error",
                {
                    statusCode: 500,
                    cause: "response_parse",
                },
            );
        }

        return data;
    }

    private handleResponse(data: unknown): Message {
        const getDataError = () => new RuntimeError("twilio_error", { cause: "response_data", meta: { data } });

        if (typeof data !== "object" || data === null) throw getDataError();


        const {
            sid: id,
            to,
            from,
            body,
            num_segments: segmentsStr,
            status: resStatus,
            price: resPrice,
            price_unit: resPriceUnit,
        } = data as Record<string, unknown>;

        if (typeof id !== "string" || typeof to !== "string" || typeof from !== "string") throw getDataError();
        if (typeof body !== "string") throw getDataError();
        if (typeof resStatus !== "string") throw getDataError();
        const status = TwilioProvider.messageStatus(resStatus);

        if (typeof segmentsStr !== "string") throw getDataError();
        const segments = Number(segmentsStr);
        if (typeof segments !== "number" || !Number.isSafeInteger(segments)) throw getDataError();

        if (typeof resPrice !== "number" && resPrice !== null) throw getDataError();
        if (typeof resPriceUnit !== "string" && resPriceUnit !== null) throw getDataError();
        const priceData: [number, string] | undefined = resPrice && resPriceUnit ? [resPrice, resPriceUnit] : undefined;

        return {
            id,
            to,
            from,
            body,
            segments,
            price: priceData,
            status,
        };
    }

    private get baseURL() {
        return new URL(`https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSID}`);
    }
    private get sendURL() {
        return new URL(`${this.baseURL.toString()}/Messages.json`);
    }
    private fetchURL(sid: string) {
        return new URL(`${this.baseURL.toString()}/Messages/${sid}.json`);
    }
    private get authHeader() {
        const val = `${this.config.accountSID}:${this.config.authToken}`;
        return `Basic ${btoa(val)}`;
    }

    private static messageStatus(twilioStatus: string): MessageStatus {
        switch (twilioStatus) {
            case "accepted":
            case "scheduled":
            case "queued":
            case "sending":
                return MessageStatus.QUEUED;

            case "sent":
            case "delivered":
                return MessageStatus.SENT;

            case "canceled":
            case "failed":
            case "undelivered":
                return MessageStatus.FAILED;

            case "receiving":
            case "received":
            case "read":
            default:
                // This should never happen
                return MessageStatus.FAILED;
        }
    }
}


// async function useSendGrid(config: ProviderSendGrid, req: Request) {
//     const apiKeyVariable = config.apiKeyVariable ?? "SENDGRID_API_KEY";
//     const apiKey = Deno.env.get(apiKeyVariable);
//     assertExists(apiKey, `Missing environment variable: ${apiKeyVariable}`);
  
//       const content = [];
//       if (req.text) {
//           content.push({ type: "text/plain", value: req.text });
//       }
//       if (req.html) {
//           content.push({ type: "text/html", value: req.html });
//       }
  
//       const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
//           method: "POST",
//           headers: {
//               "Authorization": `Bearer ${apiKey}`,
//               "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//               personalizations: [{
//                   to: req.to.map(({ email, name }) => ({ email, name })),
//                   cc: req.cc?.map(({ email, name }) => ({ email, name })),
//                   bcc: req.bcc?.map(({ email, name }) => ({ email, name })),
//               }],
//               from: { email: req.from.email, name: req.from.name },
//               reply_to_list: req.replyTo?.map(({ email, name }) => ({ email, name })),
//               subject: req.subject,
//               content: [
//                   { type: "text/plain", value: req.text },
//                   { type: "text/html", value: req.html },
//               ],
//           }),
//       });
//       if (!response.ok) {
//           throw new RuntimeError("SENDGRID_ERROR", {
//               meta: {
//                   status: response.status,
//                   text: await response.text(),
//               },
//           });
//       }
//   }

