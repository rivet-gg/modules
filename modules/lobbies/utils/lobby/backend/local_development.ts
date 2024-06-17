import { Region } from "../../region.ts";

export type BackendLocalDevelopmentPortProtocol = "http" | "tcp" | "udp";

// MARK: Config
export interface BackendLocalDevelopmentConfig {
	version?: string;
  tags?: Record<string, string>,
  maxPlayers?: number,
  maxPlayersDirect?: number,
  ports: Record<string, BackendLocalDevelopmentConfigPort>
}

export interface BackendLocalDevelopmentConfigPort {
	protocol: BackendLocalDevelopmentPortProtocol;
	hostname?: string;
	port: number;
}

// MARK: State
export interface LobbyBackendLocalDevelopmentState {
	ports: Record<string, LobbyBackendLocalDevelopmentPort>;
}

export interface LobbyBackendLocalDevelopmentPort {
	protocol: BackendLocalDevelopmentPortProtocol;
	hostname: string;
	port: number;
}

// MARK: Repsponse
export interface LobbyBackendLocalDevelopmentResponse {
	ports: Record<string, LobbyBackendLocalDevelopmentPort>;
}

export const REGIONS: Region[] = [
  {
		id: "local",
		display_name: "Local",
		latitude: 32.232330,
		longitude: -110.961670,
	}
];

