import {
	NetworkMode,
	PortProtocol,
	PortRouting,
	Resources,
	Server,
} from "./types.ts";

export interface CreateServerNetworkRequest {
	mode?: NetworkMode;
	ports: Record<string, CreateServerPortRequest>;
}
export interface CreateServerPortRequest {
	protocol: PortProtocol;
	internal_port?: number;
	routing?: PortRouting;
}
export interface CreateServerRequest {
	datacenter: string;
	tags?: unknown;
	image_id: string;
	arguments?: string[];
	environment?: Record<string, string>;
	network: CreateServerNetworkRequest;
	resources: Resources;
	kill_timeout?: number;
  webbhook_url?: string;
}
export interface CreateServerResponse {
	server: Server;
}
export interface DestroyServerResponse {
	server_id: string;
}
export interface GetServerResponse {
	server: Server;
}
