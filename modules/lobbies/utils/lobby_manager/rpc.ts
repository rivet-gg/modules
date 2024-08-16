import { LobbyResponse } from "../lobby/mod.ts";
import { PlayerResponse } from "../player.ts";

/**
 * Common response type used for create/find/join requests.
 */
interface BaseLobbyResponse {
	lobby: LobbyResponse;
	players: PlayerResponse[];
}

// MARK: Create Lobby
export interface CreateLobbyRequest {
	lobby: LobbyRequest;
	players: PlayerRequest[];
	noWait: boolean;
}

export type CreateLobbyResponse = BaseLobbyResponse;

// MARK: Destroy Lobby
export interface DestroyLobbyRequest {
	lobbyId: string;
  reason?: string;
  cause?: Error;
}

// MARK: Find Lobby
export interface FindLobbyRequest {
	query: QueryRequest;
	players: PlayerRequest[];
	noWait: boolean;
}

export type FindLobbyResponse = BaseLobbyResponse;

// MARK: Find or Create
export interface FindOrCreateLobbyRequest {
	query: QueryRequest;
	lobby: LobbyRequest;
	players: PlayerRequest[];
	noWait: boolean;
}

export type FindOrCreateLobbyResponse = BaseLobbyResponse;

// MARK: Set Lobby Ready
export interface SetLobbyReadyRequest {
	lobbyId: string;
	hasLobbyToken: boolean;
}

// MARK: List Lobbies
export type ListLobbiesRequest = QueryRequest;

export interface ListLobbiesResponse {
	lobbies: LobbyResponse[];
}

// MARK: Create Players
export interface JoinLobbyRequest {
	lobbyId: string;
	players: PlayerRequest[];
	// TODO: Make noWait only be passed to rpc
	noWait: boolean;
}

export type JoinLobbyResponse = BaseLobbyResponse;

// MARK: Destroy Players
export interface DestroyPlayersRequest {
	lobbyId: string;
	hasLobbyToken: boolean;
	playerIds: string[];
}

// MARK: Set Players Connected
export interface SetPlayersConnectedRequest {
	lobbyId: string;
	hasLobbyToken: boolean;
	playerIds: string[];
}

// MARK: Common
export interface QueryRequest {
	/**
	 * Version is required in query in order to correctly match the client to the
	 * correct server version.
	 */
	version: string;
	regions?: string[];
	tags?: Record<string, string>;
}

export interface LobbyRequest {
	lobbyId: string;
	version: string;
	region: string;
	tags?: Record<string, string>;
	maxPlayers: number;
	maxPlayersDirect: number;
}

export interface PlayerRequest {
	publicIp?: string;
}
