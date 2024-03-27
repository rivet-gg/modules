import { ScriptContext, RuntimeError } from "../_gen/scripts/init_board.ts";
import { fromPrisma } from "../utils/types.ts";
import { Leaderboard } from "../utils/types.ts";

export interface Request {
	options: Omit<Leaderboard, "createdAt" | "updatedAt" | "locked">,
	overwrite?: boolean;
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
				key: req.options.key,
			}
		});

		if (existingLeaderboard) {
			if (req.overwrite || existingLeaderboard.removedAt) {
				// Set the previous leaderboard as deleted and locked to keep
				// other requests from overwriting it.
				await db.leaderboard.update({
					where: {
						key: req.options.key,
					},
					data: {
						locked: true,
						removedAt: new Date().toISOString(),
					}
				});

				// Set the previous leaderboard's entries as deleted so that
				// they don't show up on the new one.
				await db.entry.updateMany({
					where: {
						leaderboardKey: req.options.key,
					},
					data: {
						removedAt: new Date().toISOString(),
					}
				});
			} else {
				throw new RuntimeError(
					"leaderboard_already_exists",
					{ cause: `Leaderboard with key ${req.options.key} already exists` },
				);
			}
		}

		const newLeaderboardPayload = {
			key: req.options.key,
			name: req.options.name,
			locked: false,

			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			removedAt: null,
		};

		const newLeaderboard = await db.leaderboard.upsert({
			where: {
				key: req.options.key,
			},
			update: newLeaderboardPayload,
			create: newLeaderboardPayload,
		});

		return newLeaderboard;
	});

    return { leaderboard: fromPrisma(leaderboard) };
}
