import { Context } from "@ogs/runtime";
import { User } from "../schema/common.ts";
import { TokenWithSecret } from "../../tokens/schema/common.ts";
import { Response as TokenCreateResponse } from "../../tokens/scripts/create.ts";

export interface Request {
    username: string;
    identity: IdentityType;
}

export interface Response {
    user: User;
    token: TokenWithSecret;
}

export type IdentityType = { guest: IdentityTypeGuest };

export interface IdentityTypeGuest {

}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    await ctx.call("rate_limit", "throttle", { requests: 2, period: 5 * 60 });

    // Create user
    const user = await ctx.postgres.transaction<User>("register", async tx => {
        const userQuery = await tx.queryObject<User>`INSERT INTO users (username) VALUES (${req.username}) RETURNING *`;
        const user = userQuery.rows[0];

        const identity = await tx.queryObject<{ id: string }>`INSERT INTO identities (user_id) VALUES (${user.id}) RETURNING id`;
        const identityId = identity.rows[0].id;

        if (req.identity.guest) {
            await tx.queryObject`INSERT INTO identity_guests (identity_id) VALUES (${identityId})`;
        } else {
            throw new Error("Invalid identity type");
        }

        return user;
    });

    // Create token
    const { token } = await ctx.call("tokens", "create", {
        type: "user",
        meta: { userId: user.id },
        expire_at: Temporal.Now.plainDateISO().add({ days: 30 }).toString(),
    }) as TokenCreateResponse;

    return { user, token };
}
