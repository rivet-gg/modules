import {
	Build,
	Datacenter,
	Lifecycle,
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
	runtime: CreateServerRuntimeRequest;
	network: CreateServerNetworkRequest;
	resources: Resources;
	lifecycle?: Lifecycle;
}

export interface CreateServerRuntimeRequest {
	build: string;
	arguments?: string[];
	environment?: Record<string, string>;
}

export interface CreateServerResponse {
	server: Server;
}

export interface DestroyServerResponse {
}

export interface GetServerResponse {
	server: Server;
}

export interface DestroyServerRequest {
	override_kill_timeout?: number;
}

export interface GetServersRequest {
	tags_json?: string;
	include_destroyed?: boolean;
	cursor?: string;
}

export interface ListServersResponse {
	servers: Server[];
}

export interface ListBuildsRequest {
}

export interface ListBuildsResponse {
	builds: Build[];
}

export interface ListDatacentersResponse {
	datacenters: Datacenter[];
}
