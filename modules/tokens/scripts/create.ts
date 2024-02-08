import { getRandomValues } from "https://deno.land/std/crypto/mod.ts";
import { Context } from "../../../engine/runtime/src/index.ts";
import { Token } from "../schema/common.ts";

export interface Request {
    type: string;
    meta: any;
    expire_at?: string;
}

export interface Response {
    token: Token;
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    let tokenStr = generateToken(req.type);
    let query = await ctx.postgres.run(conn => conn.queryObject`INSERT INTO tokens (token, type, meta, trace, expire_at) VALUES (${tokenStr}, ${req.type}, ${req.meta}, ${ctx.trace}, ${req.expire_at}) RETURNING *`)

    return {
        token: query.rows[0]
    };
}

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateToken(type: string): string {
    let len = 40;

    // Select random numbers
    const buf = new Uint32Array(len);
    crypto.getRandomValues(buf);

    // Map to characters
    let output = "";
    for (let i = 0; i < buf.length; i++) {
        output += CHARACTERS[buf[i] % CHARACTERS.length];
    }

    return `${type}_${output}`;
}

