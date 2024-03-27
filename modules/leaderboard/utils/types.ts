import {
    Leaderboard as PrismaLeaderboard,
    Entry as PrismaLeaderboardEntry,
} from "../_gen/prisma/index.d.ts";

export interface Leaderboard {
    key: string;
    name: string;

    locked: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LeaderboardEntry {
    leaderboardKey: string;
    ownerId: string;
    score: number;

    createdAt: string;
    updatedAt: string;
}

export type SortType = "asc" | "desc";

export const fromPrisma = (leaderboard: PrismaLeaderboard): Leaderboard => ({
    key: leaderboard.key,
    name: leaderboard.name,
    locked: leaderboard.locked,
    createdAt: leaderboard.createdAt.toISOString(),
    updatedAt: leaderboard.updatedAt.toISOString(),
});

export const fromPrismaEntry = (entry: PrismaLeaderboardEntry): LeaderboardEntry => ({
    leaderboardKey: entry.leaderboardKey,
    ownerId: entry.ownerId,
    score: entry.score,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
});
