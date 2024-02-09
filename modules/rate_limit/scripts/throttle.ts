import { Context } from "@ogs/runtime";

export interface Request {
    /**
     * Number of requests in `period` before rate limiting.
     * @default 20
     **/
    requests?: number;

    /**
     * How frequently to reset the request counter.
     * @default 300
     **/
    period?: number;
}

export interface Response {

}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    // TODO:

    return {};
}
