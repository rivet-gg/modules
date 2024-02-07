import { Context } from "../../../engine/runtime/src/index.ts";
import { User } from "../schema/common.ts";

export interface Request {
    username: string;
}

export interface Response {
    user: User;
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    // await req.auth("user");

    return { user: {
        id: "123",
        username: "Alice",
    } };
}

