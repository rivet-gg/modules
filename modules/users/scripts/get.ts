import { Context } from "../../../engine/runtime/src/index.ts";
import { User } from "../schema/common.ts";

export interface Request {
    userIds: string[];
}

export interface Response {
    users: User[];
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    // await req.auth("user");

    // let rows = await ctx.pg.query("SELECT * FROM users WHERE id = ANY($1)", [req.user_ids]);
    // let users = rows.map((row) => {
    //     return {
    //         id: row.id,
    //         name: row.name,
    //     };
    // });

    let users = req.userIds.map((id) => {
        return {
            id,
            username: "Alice",
        };
    });

    return { users };
}

