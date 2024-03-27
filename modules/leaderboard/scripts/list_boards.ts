import { ScriptContext } from "../_gen/scripts/list_boards.ts";
import { fromPrisma } from "../utils/types.ts";
import { Leaderboard } from "../utils/types.ts";

export interface Request {
    keyContains?: string;
}

export interface Response {
    leaderboards: Leaderboard[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    const existingLeaderboards = await ctx.db.leaderboard.findMany({
        where: {
            key: {
                contains: req.keyContains,
            },
            removedAt: null,
        }
    });

    return { leaderboards: existingLeaderboards.map(fromPrisma) };
}
