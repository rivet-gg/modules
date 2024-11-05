import { BlumintMatchTeamPlayerStatus } from "../utils/types.ts";
import { ScriptContext, Query, Database } from "../module.gen.ts";

export interface PlayerAndStatus {
    playerId: string;
    status: BlumintMatchTeamPlayerStatus;
}

export interface Request {
    matchId: string;
	playerUpdates: PlayerAndStatus[];
}

export interface Response {}

export async function run(
	ctx: ScriptContext,
	req: Request
): Promise<Response> {
    await ctx.db.transaction(async (db) => {
        for (const player of req.playerUpdates) {
            try {
                await db.update(Database.blumintMatchTeamPlayers)
                .set({
                    status: player.status
                })
                .where(Query.and(
                    Query.eq(Database.blumintMatchTeamPlayers.userId, player.playerId),
                    Query.eq(Database.blumintMatchTeamPlayers.matchId, req.matchId)
                ));
            } catch (e) {
                console.log(e.stack)
            }
        }
    });

    return {};
}