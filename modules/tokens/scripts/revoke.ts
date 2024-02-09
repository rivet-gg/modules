import { Context } from "@ogs/runtime";

export interface Request {
    tokenIds: string[];
}

export interface Response {
    updates: Record<string, TokenUpdate>;
}

export enum TokenUpdate {
    Revoked = "REVOKED",
    AlreadyRevoked = "ALREADY_REVOKED",
    NotFound = "NOT_FOUND",
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    const query = await ctx.postgres.run(conn => conn.queryObject<{ token: string, already_revoked: boolean }>`
        WITH pre_update AS (
            SELECT token, revoked_at
            FROM tokens
            WHERE id = ANY(${req.tokenIds})
        )
        UPDATE tokens
        SET revoked_at = timezone('UTC', now())
        FROM pre_update
        WHERE token = pre_update.token
        RETURNING token, pre_update.revoked_at IS NOT NULL AS already_revoked
    `);

    const updates: Record<string, TokenUpdate> = {};
    for (const token of req.tokenIds) {
        const tokenRow = query.rows.find(row => row.token === token);
        if (tokenRow) {
            updates[token] = tokenRow.already_revoked ? TokenUpdate.AlreadyRevoked : TokenUpdate.Revoked;
        } else {
            updates[token] = TokenUpdate.NotFound;
        }
    }

    return { updates };
}
