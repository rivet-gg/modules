import { assert, assertEquals, assertExists, resolve } from "../deps.ts";
import { UserError } from "../error/mod.ts";
import { PostgresClient } from "../migrate/deps.ts";
import { Project } from "../project/project.ts";
import { verbose } from "../term/status.ts";
import { createOnce, getOrInitOnce } from "../utils/once.ts";
import { addShutdownHandler } from "../utils/shutdown_handler.ts";
import { getClient, getDatabaseUrl, Manager, setup } from "./manager.ts";
import { Status } from "./manager.ts";
import { status } from "./manager.ts";
import { createManager } from "./manager.ts";
import { Settings } from "./settings.ts";

export const DEFAULT_VERSION = "16.4.0";
export const DEFAULT_DATABASE = "opengb";

/**
 * Holds the manager that was created.
 */
const DEFAULT_MANAGER = createOnce<Manager>();

/**
 * Indicates if Postgres has already been setup once.
 */
const ENSURE_RUNNING_ONCE = createOnce<void>();

/**
 * Default Postgres client to reuse between commands.
 */
const DEFAULT_CLIENT = createOnce<PostgresClient>();

export function postgresEnabled(): boolean {
	return !Deno.env.has("DATABASE_URL") && !Deno.env.has("OPENGB_DONT_START_POSTGRES");
}

/**
 * Create Postgres manager if needed.
 *
 * This will not setup Postgres. See `ensurePostgresRunning` for that.
 */
export async function getDefaultPostgresManager(project: Project): Promise<Manager | undefined> {
	if (!postgresEnabled()) {
		verbose("Postgres disabled");
		return;
	}

	return await getOrInitOnce(DEFAULT_MANAGER, async () => {
		const settings = defaultSettings(project);
		return await createManager(settings);
	});
}

/**
 * Create & setup Postgres manager if needed.
 */
export async function ensurePostgresRunning(project: Project) {
	return await getOrInitOnce(ENSURE_RUNNING_ONCE, async () => {
		const manager = await getDefaultPostgresManager(project);
		if (manager) {
			await setup(manager);
		}
	});
}

function defaultSettings(project: Project): Settings {
	const postgresRoot = resolve(project.path, ".opengb", "postgres");

	const stateFile = resolve(postgresRoot, "manager_state.json");
	const passwordFile = resolve(postgresRoot, ".pgpass");
	const dataDir = resolve(postgresRoot, "data");
	const installationDir = resolve(postgresRoot, "install");

	return {
		stateFile,
		version: DEFAULT_VERSION,
		installationDir,
		passwordFile,
		dataDir,
		host: "localhost",
		port: 0,
		configuration: {},
		defaultDatabases: [DEFAULT_DATABASE],
	};
}

export async function getDefaultClient(project: Project): Promise<PostgresClient> {
	return await getOrInitOnce(DEFAULT_CLIENT, async () => {
		assert(postgresEnabled());

		const manager = await getDefaultPostgresManager(project);
		assertExists(manager);

		const client = await getClient(manager, DEFAULT_DATABASE);

		addShutdownHandler(async () => {
			verbose("Shutting down default database client");
			await client.end();
		});

		return client;
	});
}

export async function getDefaultDatabaseUrl(project: Project): Promise<string> {
	assert(postgresEnabled());

	const manager = await getDefaultPostgresManager(project);
	assertExists(manager);

	return getDatabaseUrl(manager, DEFAULT_DATABASE);
}
