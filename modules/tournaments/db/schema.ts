import { Query, schema } from "./schema.gen.ts";

export enum BlumintMatchStatus {
    PENDING = "pending", // Players are entering the lobby and or waiting for the match to start
    RUNNING = "running", // Players are actively battling
    COMPLETE = "complete", // Match has ended successfully
    CANCELLED = "cancelled" // Match has ended unsuccessfully (like players not joining or server crash)
}

export enum BlumintMatchTeamPlayerStatus {
    PRESENT_READY = "present-ready", // Player is actively in the match
    PRESENT_NOT_READY = "present-not-ready", // Player is in the match but not ready
    ABSENT = "absent", // Player is not in the match
}

export const blumintMatches = schema.table("matches", {
    matchId: Query.uuid("match_id").notNull().primaryKey(),
    lobbyId: Query.uuid("lobby_id").notNull(),
    tournamentId: Query.uuid("tournament_id").notNull(),
    status: Query.text("status").notNull() // BlumintMatchStatus
});


export const blumintMatchTeams = schema.table("match_teams", {
    teamId: Query.uuid("team_id").notNull().primaryKey(),
	matchId: Query.uuid("match_id").notNull().references(() => blumintMatches.matchId)
});

export const blumintMatchTeamPlayers = schema.table("match_team_players", {
    userId: Query.uuid("user_id").notNull().primaryKey(),
    teamId: Query.uuid("team_id").notNull().references(() => blumintMatchTeams.teamId),
    status: Query.text("status").notNull() // BlumintMatchTeamPlayerStatus
});
