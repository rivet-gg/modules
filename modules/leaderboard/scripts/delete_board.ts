import { ScriptContext, RuntimeError } from "../_gen/scripts/delete_board.ts";

export interface Request {
    key: string;
}

export type Response = Record<string, never>;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    await ctx.db.$transaction(async (db) => {
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

        await db.leaderboard.update({
            where: {
                key: req.key,
            },
            data: {
                removedAt: new Date().toISOString(),
            }
        });

        await db.entry.updateMany({
            where: {
                leaderboardKey: req.key,
            },
            data: {
                removedAt: new Date().toISOString(),
            }
        });
    });

    return { };
}
