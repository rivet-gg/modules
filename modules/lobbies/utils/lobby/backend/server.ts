import { Region } from "../../region.ts";
import { Server as RivetServer } from "../../rivet/types.ts";
import * as rivetTypes from "../../rivet/types.ts";

// MARK: Config
export interface BackendServerConfig {
	// TODO: Auto-determine build
	resources: rivetTypes.Resources;
	arguments?: string[];
	environment?: Record<string, string>;
	networkMode?: rivetTypes.NetworkMode;
	ports: Record<string, BackendServerConfigPort>;
}

export interface BackendServerConfigPort {
	protocol: rivetTypes.PortProtocol;
	internalPort?: number;
	routing?: rivetTypes.PortRouting;
}

// MARK: State
export interface LobbyBackendServerState {
	serverId: string;
	data?: RivetServer;
}

// MARK: Response
export interface LobbyBackendServerResponse {
	serverId: string;
	ports?: Record<string, LobbyBackendServerPortResponse>;
}

export interface LobbyBackendServerPortResponse {
	protocol: rivetTypes.PortProtocol;
	internalPort?: number;
	publicHostname?: string;
	publicPort?: number;
	routing: rivetTypes.PortRouting;
}

export const REGIONS: Region[] = [
  {
    id: "atl",
    display_name: "Atlanta",
    latitude: 33.7490,
    longitude: -84.3880,
  },
  {
    id: "lax",
    display_name: "Los Angeles",
    latitude: 34.0522,
    longitude: -118.2437,
  },
  {
    id: "fra",
    display_name: "Frankfurt",
    latitude: 50.1109,
    longitude: 8.6821,
  },
  {
    id: "syd",
    display_name: "Sydney",
    latitude: -33.8688,
    longitude: 151.2093,
  },
  {
    id: "osa",
    display_name: "Osaka",
    latitude: 34.6937,
    longitude: 135.5023,
  },
  {
    id: "gru",
    display_name: "São Paulo",
    latitude: -23.5505,
    longitude: -46.6333,
  },
  {
    id: "bom",
    display_name: "Mumbai",
    latitude: 19.0760,
    longitude: 72.8777,
  },
  {
    id: "sin",
    display_name: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
  },
];

