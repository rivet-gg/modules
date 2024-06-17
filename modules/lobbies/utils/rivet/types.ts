import { Empty } from "../../module.gen.ts";

export type GameGuardRouting = Empty;
export type HostRouting = Empty;
export interface Network {
	mode?: NetworkMode;
	ports: Record<string, Port>;
}
export type NetworkMode = "bridge" | "host";
export interface Port {
	protocol: PortProtocol;
	server_port?: number;
	public_hostname?: string;
	public_port?: number;
	routing: PortRouting;
}
export type PortProtocol = "http" | "https" | "tcp" | "tcp_tls" | "udp";
export interface PortRouting {
	game_guard?: GameGuardRouting;
	host?: HostRouting;
}
export interface Resources {
	cpu: number;
	memory: number;
}
export interface Server {
	server_id: string;
	game_id: string;
	datacenter_id: string;
	cluster_id: string;
	metadata?: unknown;
	image_id: string;
	args?: string[];
	environment?: Record<string, string>;
	network: Network;
	resources: Resources;
	kill_timeout?: number;
	create_ts: number;
	destroy_ts?: number;
}
