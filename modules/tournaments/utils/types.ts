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

export interface BlumintMatchPlayerStats {
    status: BlumintMatchTeamPlayerStatus;
    inGameId: string;
}

export interface BlumintMatchPlayerFinalStats {
    playerId: string;
}

export const PLAYER_SOCIALS = [
    "email",
    "phone",
    "erc20Address",
    "apple",
    "facebook",
    "google",
    "twitter",
    "discord",
    "epic",
    "steam"
] as const;

export type PlayerSocial = typeof PLAYER_SOCIALS[number]

export interface PlayerPossibleIds {
    email?: string[];
    phone?: string[];
    erc20Address?: string[];
    apple?: string[];
    facebook?: string[];
    google?: string[];
    twitter?: string[];
    discord?: string[];
    epic?: string[];
    steam?: string[];
}

export interface PlayerAssociations {
    email?: string[];
    phone?: string[];
    erc20Address?: string[];
    apple?: string[];
    facebook?: string[];
    google?: string[];
    twitter?: string[];
    discord?: string[];
    epic?: string[];
    steam?: string[];
}

export interface BlumintMatchTeamStats {
    players: BlumintMatchPlayerStats[];
}

export interface BlumintMatchTeamFinalStats {
    players: BlumintMatchPlayerFinalStats[];
}

export interface BlumintMatchStats {
    status: BlumintMatchStatus;
    teams: BlumintMatchTeamStats[];
}

export interface BlumintMatchFinalStats {
    matchId: string;
    teams: BlumintMatchTeamFinalStats[];
}