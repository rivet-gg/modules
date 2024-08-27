import { resolve } from "../deps.ts";

export interface Settings {
	stateFile: string;
	version: string;
	installationDir: string;
	passwordFile: string;
	dataDir: string;
	host: string;
	/** If undefined, a pot will be chosen on startup. */
	port?: number;
	/** Configuration parameters to pass to Postgres. */
	configuration: Record<string, string>;
	/** Creates these databases by default. */
	defaultDatabases: string[];
}

export function binaryDir(settings: Settings): string {
	return resolve(settings.installationDir, "bin");
}
