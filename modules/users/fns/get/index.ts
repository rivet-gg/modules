import { run, Context } from "@ogs/engine"
import { Request, Response } from "./gen";

export async function handler(ctx: Context, req: Request): Promise<Response> {
    // await req.auth("user");

    // let rows = await ctx.pg.query("SELECT * FROM users WHERE id = ANY($1)", [req.user_ids]);
    // let users = rows.map((row) => {
    //     return {
    //         id: row.id,
    //         name: row.name,
    //     };
    // });

    let users = req.user_ids.map((id) => {
        return {
            id,
            name: "Alice",
        };
    });

    return { users };
}

