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
	internal_port?: number;
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
	id: string;
	environment: string;
	datacenter: string;
	tags?: unknown;
	runtime: Runtime;
	network: Network;
	resources: Resources;
	lifecycle: Lifecycle;
	created_at: number;
	started_at?: number;
	destroyed_at?: number;
}

export interface Runtime {
	build: string;
	arguments?: string[];
	environment?: Record<string, string>;
}

export interface Lifecycle {
	kill_timeout?: number;
}

export type BuildKind = "docker_image" | "oci_bundle";
export type BuildCompression = "none" | "lz4";

export interface Build {
  id: string;
  name: string;
  created_at: string;
  content_length: number;
  tags: Record<string, string>;
}

export interface Datacenter {
	id: string;
  slug: string;
  name: string;
}
