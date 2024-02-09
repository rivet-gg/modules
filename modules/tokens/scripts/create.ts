import { Context } from "@ogs/runtime";
import { TokenWithSecret } from "../schema/common.ts";

export interface Request {
    type: string;
    meta: { [key: string]: any };
    expire_at?: string;
}

export interface Response {
    token: TokenWithSecret;
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    const tokenStr = generateToken(req.type);
    const query = await ctx.postgres.run(conn => conn.queryObject<TokenWithSecret>`
        INSERT INTO tokens (token, type, meta, trace, expire_at)
        VALUES (${tokenStr}, ${req.type}, ${req.meta}, ${ctx.trace}, ${req.expire_at})
        RETURNING token, id, type, meta, to_json(created_at) AS created_at, to_json(expire_at) AS expire_at, to_json(revoked_at) AS revoked_at
    `)

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

