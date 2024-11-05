import { Query, schema } from "./schema.gen.ts";

export const blumintMatches = schema.table("matches", {
    id: Query.uuid("match_id").notNull().primaryKey().defaultRandom(),
    lobbyId: Query.uuid("lobby_id").notNull(),
    status: Query.text("status").notNull() // BlumintMatchStatus
});

export const matchRelations = Query.relations(blumintMatches, ({ many }) => ({
    teams: many(blumintMatchTeams),
}));
  

export const blumintMatchTeams = schema.table("match_teams", {
    id: Query.uuid("team_id").notNull().primaryKey().defaultRandom(),
	matchId: Query.uuid("match_id").notNull().references(() => blumintMatches.id, {onDelete: 'cascade'})
});

export const matchTeamRelations = Query.relations(blumintMatchTeams, ({ one, many }) => ({
    match: one(blumintMatches, {
        fields: [blumintMatchTeams.matchId],
        references: [blumintMatches.id]
    }),
    players: many(blumintMatchTeamPlayers),
}));

export const blumintMatchTeamPlayers = schema.table("match_team_players", {
    userId: Query.uuid("user_id").notNull(),
    teamId: Query.uuid("team_id").notNull().references(() => blumintMatchTeams.id, {onDelete: 'cascade'}),
    // No casce since team will cascade delete players
    matchId: Query.uuid("match_id").notNull().references(() => blumintMatches.id),
    status: Query.text("status").notNull() // BlumintMatchTeamPlayerStatus
}, (table) => ({
    pk: Query.primaryKey({ columns: [table.userId, table.teamId] }),
}));

export const matchTeamPlayersRelations = Query.relations(blumintMatchTeamPlayers, ({ one }) => ({
    match: one(blumintMatchTeams, {
        fields: [blumintMatchTeamPlayers.teamId],
        references: [blumintMatchTeams.id]
    }),
}));