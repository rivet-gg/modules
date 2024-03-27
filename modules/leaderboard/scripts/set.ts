import { ScriptContext, RuntimeError } from "../_gen/scripts/set.ts";
import { fromPrisma, fromPrismaEntry } from "../utils/types.ts";
import { Leaderboard, LeaderboardEntry } from "../utils/types.ts";

export interface Request {
    key: string;
    ownerId: string;
    score: number;
}

export interface Response {
    leaderboard: Leaderboard;
    entry: LeaderboardEntry;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    const { leaderboard, entry } = await ctx.db.$transaction(async (db) => {
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
            throw new RuntimeError(
                "leaderboard_locked",
                { cause: `Leaderboard with key ${req.key} is locked` },
            );
        }

        const entry = await db.entry.upsert({
            where: {
                ownerId_leaderboardKey: {
                    leaderboardKey: req.key,
                    ownerId: req.ownerId,
                }
            },
            update: {
                score: req.score,
                updatedAt: new Date().toISOString(),
                removedAt: null,
            },
            create: {
                leaderboardKey: req.key,
                ownerId: req.ownerId,
                score: req.score,
            }
        });

        return {
            leaderboard: existingLeaderboard,
            entry,
        };
    });

    return {
        leaderboard: fromPrisma(leaderboard),
        entry: fromPrismaEntry(entry),
    };
}
