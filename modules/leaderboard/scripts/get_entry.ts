import { ScriptContext, RuntimeError } from "../_gen/scripts/get_entry.ts";
import { LeaderboardEntry, SortType, fromPrismaEntry } from "../utils/types.ts";

export interface Request {
    key: string;
    ownerId: string;
    sortType: SortType;
}

export interface Response {
    entry: LeaderboardEntry;
    index: number;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    const { entry, index } = await ctx.db.$transaction(async (db) => {
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


        const entry = await db.entry.findFirst({
            where: {
                leaderboardKey: req.key,
                ownerId: req.ownerId,
                removedAt: null,
            },
        });

        if (!entry) {
            throw new RuntimeError(
                "entry_not_found",
                { cause: `${req.ownerId} does not have an entry on leaderboard with key ${req.key}` },
            );
        }

        const index = await db.entry.count({
            where: {
                leaderboardKey: req.key,
                score: req.sortType === "desc" ? {
                    gt: entry.score,
                } : {
                    lt: entry.score,
                },
            },
        });

        return { entry, index };
    });

    return {
        entry: fromPrismaEntry(entry),
        index,
    };
}
