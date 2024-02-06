import { Context } from "../../../../engine/runtime/src/index"
import { ogs } from "../../../../dist/schema";

export async function handler(ctx: Context, req: ogs.modules.users.scripts.get.IRequest): Promise<ogs.modules.users.scripts.get.IResponse> {
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
            name: "Alice",
        };
    });

    return { users };
}

