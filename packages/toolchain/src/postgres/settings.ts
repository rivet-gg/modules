import { resolve } from "../deps.ts";
import { Project } from "../project/mod.ts";

export const DEFAULT_VERSION = "16.4.0";
export const BOOTSTRAP_SUPERUSER = "postgres";
export const BOOTSTRAP_DATABASE = "postgres";

export interface Settings {
	releasesUrl: string;
	version: string;
	installationDir: string;
	passwordFile: string;
	dataDir: string;
	host: string;
	port: number;
	username: string;
	password: string;
	temporary: boolean;
	timeout: number;
	configuration: Record<string, string>;
}

export async function defaultSettings(project: Project): Promise<Settings> {
	const postgresRoot = resolve(project.path, ".opengb", "postgres");

	const passwordFile = resolve(postgresRoot, ".pgpass");
	const dataDir = resolve(postgresRoot, "data");
	const installationDir = resolve(postgresRoot, "install");

	const password = Array.from(crypto.getRandomValues(new Uint8Array(16)))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return {
		releasesUrl: "",
		version: DEFAULT_VERSION,
		installationDir,
		passwordFile,
		dataDir,
		host: "localhost",
		port: 0,
		username: BOOTSTRAP_SUPERUSER,
		password,
		temporary: true,
		timeout: 5000,
		configuration: {},
	};
}

export function binaryDir(settings: Settings): string {
	return resolve(settings.installationDir, "bin");
}

export function url(settings: Settings, databaseName: string): string {
	return `postgresql://${settings.username}:${settings.password}@${settings.host}:${settings.port}/${databaseName}`;
}
