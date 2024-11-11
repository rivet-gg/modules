import { ScriptContext, Query, Database } from "../module.gen.ts";
import { BlumintMatchStatus, BlumintMatchTeamPlayerStatus } from "../utils/types.ts";

export interface CreateMatchPlayer {
	playerId: string;
}

export interface CreateMatchTeam {
	players: CreateMatchPlayer[];
}

export interface Request {
	teams: CreateMatchTeam[];
	matchSettings?: Record<string, any>;
}

export interface Response {
	matchId: string;
	matchUrl: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request
): Promise<Response> {
	const allPlayers = req.teams.flatMap(t => t.players);

	const { lobby } = await ctx.modules.lobbies.create({
		maxPlayers: allPlayers.length,
		maxPlayersDirect: allPlayers.length,
		// TODO: This only exists so that the lobby can be created
		// since without players, the lobby auto deletes itself
		players: [{}],
		region: "test",
		version: "lts",
		noWait: true,
	});

	// (?) Delete lobby if any db failures happen here

	// Create match
	const [{ matchId }] = await ctx.db.insert(Database.blumintMatches)
	.values({
		lobbyId: lobby.id,
		status: BlumintMatchStatus.PENDING,
		settings: req.matchSettings ?? {}
	}).returning({
		matchId: Database.blumintMatches.id
	});

	// Create teams
	const teamIds  = await ctx.db.insert(Database.blumintMatchTeams)
	.values(req.teams.map(() => ({
		matchId: matchId
	}))).returning({
		teamId: Database.blumintMatchTeams.id
	});

	// Create teams' players
	await ctx.db.insert(Database.blumintMatchTeamPlayers)
	.values(req.teams.flatMap((t, i) => t.players.map(p => ({
		userId: p.playerId,
		teamId: teamIds[i].teamId,
		matchId: matchId,
		status: BlumintMatchTeamPlayerStatus.ABSENT
	}))));

	return {
		matchId: matchId,
		matchUrl: "https://game.com/match/" + lobby.id
	}
}