import { BlumintMatchStats, BlumintMatchTeamPlayerStatus } from "../utils/types.ts";
import { ScriptContext, Query, Database } from "../module.gen.ts";

export interface Request {
	matchId: string;
}

export type Response = BlumintMatchStats;

export async function run(
	ctx: ScriptContext,
	req: Request
): Promise<Response> {
	const data = await ctx.db.query.blumintMatches.findFirst({
		where: Query.eq(Database.blumintMatches.id, req.matchId),
		columns: {
			status: true	
		},
		with: {
			teams: {
				columns: {},
				with: {
					players: {
						columns: {
							status: true
						},
						extras: {
							inGameId: Query.sql<string>`${Database.blumintMatchTeamPlayers.userId}`.as("in_game_id")
						}
					}
				}
			}
		}
	});
	if (!data) {
		throw new Error("Match not found");
	}

	return data as BlumintMatchStats;
}