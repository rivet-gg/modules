import {
	LobbyBackendTestResponse,
	LobbyBackendTestState,
} from "./backend/test.ts";
import {
	LobbyBackendServerResponse,
	LobbyBackendServerState,
} from "./backend/server.ts";
import { PlayerState } from "../player.ts";
import { LobbyBackendLocalDevelopmentResponse, LobbyBackendLocalDevelopmentState } from "./backend/local_development.ts";

export interface LobbyState {
	id: string;
	version: string;
  region: string;
	tags: Record<string, string>;

	createdAt: number;
	readyAt?: number;
	/**
	 * Timestamp at which the last player left the lobby.
	 */
	emptyAt?: number;

	players: Record<string, PlayerState>;

	maxPlayers: number;
	maxPlayersDirect: number;

	backend: LobbyBackend;
}

export type LobbyBackend = { test: LobbyBackendTestState } | { localDevelopment: LobbyBackendLocalDevelopmentState } | { server: LobbyBackendServerState };

/**
 * Check if a lobby with the given tags matches a query.
 */
export function lobbyTagsMatch(
	query: Record<string, string>,
	target: Record<string, string>,
): boolean {
	for (const key in query) {
		if (target[key] != query[key]) return false;
	}
	return true;
}

export interface LobbyResponse {
	id: string;
	version: string;
	tags: Record<string, string>;

	createdAt: number;
	readyAt?: number;

	players: number;
	maxPlayers: number;
	maxPlayersDirect: number;

	backend: LobbyBackendResponse;
}

export type LobbyBackendResponse = { test: LobbyBackendTestResponse } | { localDevelopment: LobbyBackendLocalDevelopmentResponse } | { server: LobbyBackendServerResponse };

