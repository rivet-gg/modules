import { Region } from "../../region.ts";
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

// TODO: Return dynamic regions instead of hardcoded
export const REGIONS: Region[] = [
  {
    slug: "atl",
    name: "Atlanta",
    latitude: 33.7490,
    longitude: -84.3880,
  },
  {
    slug: "lax",
    name: "Los Angeles",
    latitude: 34.0522,
    longitude: -118.2437,
  },
  {
    slug: "fra",
    name: "Frankfurt",
    latitude: 50.1109,
    longitude: 8.6821,
  },
  {
    slug: "syd",
    name: "Sydney",
    latitude: -33.8688,
    longitude: 151.2093,
  },
  {
    slug: "osa",
    name: "Osaka",
    latitude: 34.6937,
    longitude: 135.5023,
  },
  {
    slug: "gru",
    name: "São Paulo",
    latitude: -23.5505,
    longitude: -46.6333,
  },
  {
    slug: "bom",
    name: "Mumbai",
    latitude: 19.0760,
    longitude: 72.8777,
  },
  {
    slug: "sin",
    name: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
  },

  {
    slug: "lnd-atl",
    name: "Atlanta",
    latitude: 33.7490,
    longitude: -84.3880,
  },
  {
    slug: "lnd-fra",
    name: "Frankfurt",
    latitude: 50.1109,
    longitude: 8.6821,
  },
];

