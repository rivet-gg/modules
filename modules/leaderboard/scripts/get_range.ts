import { ScriptContext, RuntimeError } from "../_gen/scripts/get_range.ts";
import { fromPrismaEntry, LeaderboardEntry, SortType } from "../utils/types.ts";

export interface Request {
    key: string;
    range: [number, number];
    sortType: SortType;
}

export interface Response {
    entries: LeaderboardEntry[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    const entries = await ctx.db.$transaction(async (db) => {
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

        const entries = await db.entry.findMany({
            orderBy: {
                score: req.sortType,
            },
            skip: req.range[0],
            take: req.range[1] - req.range[0],
            where: {
                leaderboardKey: req.key,
            }
        });

        return entries;
    });

    return {
        entries: entries.map(fromPrismaEntry),
    };
}
