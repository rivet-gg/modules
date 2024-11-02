import { BlumintMatchStatus } from "../utils/types.ts";
import { ScriptContext, Query, Database } from "../module.gen.ts";
import { sendFinalStatsToBlumint } from "../utils/blumint_api.ts";

export interface Request {
	matchId: string;
	status: BlumintMatchStatus;
}

export interface Response {}

async function syncFinalStatsWithBlumint(
	ctx: ScriptContext,
	matchId: string
) {
	const data = await ctx.db.query.blumintMatches.findFirst({
		where: Query.eq(Database.blumintMatches.id, matchId),
		columns: {},
		with: {
			teams: {
				columns: {},
				with: {
					players: {
						columns: {},
						extras: {
							playerId: Query.sql<string>`${Database.blumintMatchTeamPlayers.userId}`.as("player_id")
						}
					}
				}
			}
		}
	});
	if (!data) {
		throw new Error("Match not found");
	}

	await sendFinalStatsToBlumint({
		teams: data.teams,
		matchId
	});
}

export async function run(
	ctx: ScriptContext,
	req: Request
): Promise<Response> {
	if (
		req.status === BlumintMatchStatus.COMPLETE
		|| req.status === BlumintMatchStatus.CANCELLED
	) {
		await syncFinalStatsWithBlumint(ctx, req.matchId);

		// Force destroy lobby
		const data = await ctx.db.query.blumintMatches.findFirst({
			where: Query.eq(Database.blumintMatches.id, req.matchId),
			columns: {
				lobbyId: true
			}
		});
		if (data) {
			await ctx.modules.lobbies.destroy({
				lobbyId: data.lobbyId,
				reason: "Match ended"
			})
		}
	} else {
		await ctx.db.update(Database.blumintMatches).set({
			status: req.status
		}).where(
			Query.eq(Database.blumintMatches.id, req.matchId)
		);
	}

	return {}
}