import { ScriptContext, RuntimeError } from "../_gen/scripts/lock_board.ts";
import { fromPrisma } from "../utils/types.ts";
import { Leaderboard } from "../utils/types.ts";

export interface Request {
    key: string;
}

export interface Response {
    leaderboard: Leaderboard;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    const leaderboard = await ctx.db.$transaction(async (db) => {
        const existingLeaderboard = await db.leaderboard.findFirst({
            where: {
                key: req.key,
                removedAt: null,
            }
        });

        if (!existingLeaderboard) {
            throw new RuntimeError(
                "leaderboard_not_found",
                { cause: `Leaderboard with key ${req.key} not found` },
            );
        }

        if (existingLeaderboard.locked) {
            return existingLeaderboard;
        }

        const newBoard = await db.leaderboard.update({
            where: {
                key: req.key,
            },
            data: {
                locked: true,
            }
        });

        return newBoard;
    });

    return { leaderboard: fromPrisma(leaderboard) };
}
