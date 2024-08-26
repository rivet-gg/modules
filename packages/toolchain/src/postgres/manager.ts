import {
	CreateDatabaseError,
	DatabaseExistsError,
	DatabaseInitializationError,
	DatabaseStartError,
	DatabaseStopError,
	DropDatabaseError,
} from "./error.ts";
import { binaryDir, Settings } from "./settings.ts";
import { verbose } from "../term/status.ts";
import { addShutdownHandler } from "../utils/shutdown_handler.ts";
import { PostgresClient } from "../migrate/deps.ts";
import { assertExists, dirname, ensureDir, exists, move, resolve } from "../deps.ts";
import { execute, getProgramFile } from "./command.ts";
import { getDownloadUrl, getReleaseFileNameForCurrentHost } from "./resolver.ts";
import { InternalError } from "../error/mod.ts";
import * as tar from "npm:tar";
import { readState, State, writeState } from "./state.ts";

export const BOOTSTRAP_SUPERUSER = "postgres";
export const BOOTSTRAP_DATABASE = "postgres";

export enum Status {
	NotInstalled,
	Installed,
	Initialized,
	DefaultDatabaseNotCreated,
	Stopped,
	Started,
}

export interface Manager {
	settings: Settings;
	state: State;
}

export async function createManager(settings: Settings): Promise<Manager> {
	settings.installationDir = resolve(settings.installationDir, settings.version);
	const state = await readState(settings.stateFile);
	return { settings, state };
}

export async function status(manager: Manager): Promise<Status> {
	if (!await isInstalled(manager)) {
		return Status.NotInstalled;
	} else if (!await isInitialized(manager)) {
		return Status.Installed;
	} else if (!await isStarted(manager)) {
		return Status.Stopped;
	} else if (!await isDefaultDatabaseCreated(manager)) {
		return Status.DefaultDatabaseNotCreated;
	} else {
		return Status.Started;
	}
}

export async function setup(manager: Manager): Promise<void> {
	if (!await isInstalled(manager)) {
		await install(manager);
	}
	if (!await isInitialized(manager)) {
		await initialize(manager);
	}
	if (!await isStarted(manager)) {
		await start(manager);
	}
	if (!await isDefaultDatabaseCreated(manager)) {
		await createDefaultDatabase(manager);
	}
}

async function isInstalled(manager: Manager): Promise<boolean> {
	const path = manager.settings.installationDir;
	return path.endsWith(manager.settings.version.toString()) && await exists(path);
}

async function isInitialized(manager: Manager): Promise<boolean> {
	return await exists(manager.settings.dataDir.concat("/postgresql.conf"));
}

async function isStarted(manager: Manager): Promise<boolean> {
	const pidFile = manager.settings.dataDir.concat("/postmaster.pid");
	return await exists(pidFile);
}

async function install(manager: Manager): Promise<void> {
	verbose(`Starting installation process for version ${manager.settings.version}`);

	if (await exists(manager.settings.installationDir)) {
		verbose("Installation directory already exists");
		return;
	}

	// Create download request
	const fileName = getReleaseFileNameForCurrentHost(manager.settings.version);
	const url = getDownloadUrl(manager.settings.version, fileName);
	verbose("Downloading Postgres", url);
	const response = await fetch(url);
	if (!response.ok) {
		throw new InternalError(`Failed to download Postgres: ${response.status} ${response.statusText}`);
	}

	// Download to file
	const downloadedTarGz = await Deno.makeTempFile({ prefix: "postgres-", suffix: ".tar.gz" });
	const fileWriter = await Deno.open(downloadedTarGz, { write: true, create: true });
	await response.body?.pipeTo(fileWriter.writable);

	// Extract the archive
	verbose("Extracting Postgres", downloadedTarGz);
	const extractDir = await Deno.makeTempDir();
	const extractedFolderName = fileName.replace(/\.tar\.gz$/, "");
	await tar.x({ file: downloadedTarGz, C: extractDir });

	// Move extracted subfolder to install dir
	await ensureDir(dirname(manager.settings.installationDir));
	await move(resolve(extractDir, extractedFolderName), manager.settings.installationDir);

	// Fix permissions of all bin files if not on Windows
	if (Deno.build.os !== "windows") {
		verbose("Fixing executable permissions");
		const binDir = binaryDir(manager.settings);
		for await (const entry of Deno.readDir(binDir)) {
			if (entry.isFile) {
				const filePath = resolve(binDir, entry.name);
				const fileInfo = await Deno.stat(filePath);
				if (fileInfo.mode) {
					await Deno.chmod(filePath, fileInfo.mode | 0o111);
				}
			}
		}
	}

	verbose(`Installed Postgres ${manager.settings.version}`, manager.settings.installationDir);
}

async function initialize(manager: Manager): Promise<void> {
	if (!await exists(manager.settings.passwordFile)) {
		// Generate password
		if (!manager.state.superuserPassword) {
			manager.state.superuserPassword = Array.from(crypto.getRandomValues(new Uint8Array(16)))
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");
			await writeState(manager.settings.stateFile, manager.state);
		}

		await Deno.writeTextFile(manager.settings.passwordFile, manager.state.superuserPassword);
	}

	verbose(`Initializing Postgres`, manager.settings.dataDir);

	try {
		await execute(manager.settings, {
			program: "initdb",
			args: [
				"--pgdata",
				manager.settings.dataDir,
				"--username",
				BOOTSTRAP_SUPERUSER,
				"--auth",
				"password",
				"--pwfile",
				manager.settings.passwordFile,
				"--encoding",
				"UTF8",
			],
			envs: {},
		});
		verbose(`Initialized database`, manager.settings.dataDir);
	} catch (error) {
		throw new DatabaseInitializationError({ originalError: error as any });
	}
}

async function start(manager: Manager): Promise<void> {
	let port: number | undefined = manager.settings.port;
	if (!port) {
		// Choose available port
		const listener = Deno.listen({ port: 0 });
		port = listener.addr.port;
		verbose("Picked available port for Postgres", `${port}`);
		listener.close();
	}

	// Save port for future runs
	manager.state.port = port;
	await writeState(manager.settings.stateFile, manager.state);

	// Start server
	try {
		const startLog = manager.settings.dataDir.concat("/start.log");

		const options = [];
		options.push(`-F -p ${manager.state.port}`);
		for (const [k, v] of Object.entries(manager.settings.configuration)) {
			options.push(`-c ${k}=${v}`);
		}

		await execute(manager.settings, {
			program: "pg_ctl",
			args: [
				"start",
				"--pgdata",
				manager.settings.dataDir,
				"--log",
				startLog,
				...Object.values(options).flatMap((x) => ["-o", x]),
			],
			envs: {},
		});
		verbose(`Started database ${manager.settings.dataDir} on port ${manager.state.port}`);
	} catch (error) {
		throw new DatabaseStartError({ originalError: error as any });
	}
}

export async function stop(manager: Manager): Promise<void> {
	if (!await isStarted(manager)) {
		verbose(`Database ${manager.settings.dataDir} is not running`);
		return;
	}

	verbose(`Stopping database ${manager.settings.dataDir}`);

	try {
		await execute(manager.settings, {
			program: "pg_ctl",
			args: [
				"stop",
				"--pgdata",
				manager.settings.dataDir,
				"--mode",
				"fast",
			],
			envs: {},
		});
		verbose(`Stopped database ${manager.settings.dataDir}`);
	} catch (error) {
		throw new DatabaseStopError({ originalError: error as any });
	}
}

export async function getClient(manager: Manager, databaseName: string): Promise<PostgresClient> {
	const databaseUrl = getDatabaseUrl(manager, databaseName);

	const client = new PostgresClient(databaseUrl);
	await client.connect();

	addShutdownHandler(async () => {
		verbose("Shutting down default database client");
		await client.end();
	});

	return client;
}

export async function createDatabase<S extends string>(manager: Manager, databaseName: S): Promise<void> {
	verbose(`Creating database`, databaseName);

	const client = await getClient(manager, BOOTSTRAP_DATABASE);
	try {
		await client.queryObject(`CREATE DATABASE "${databaseName}"`);
	} catch (error) {
		throw new CreateDatabaseError({ originalError: error as any });
	} finally {
		await client.end();
	}

	verbose(`Created database`, databaseName);
}

export async function databaseExists<S extends string>(manager: Manager, databaseName: S): Promise<boolean> {
	verbose(`Checking database`, databaseName);

	const client = await getClient(manager, BOOTSTRAP_DATABASE);
	try {
		const rows = await client.queryObject(
			"SELECT * FROM pg_database WHERE datname = $1",
			[databaseName],
		);
		return rows.rowCount === 1;
	} catch (error) {
		throw new DatabaseExistsError({ originalError: error as any });
	} finally {
		await client.end();
	}
}

export async function dropDatabase<S extends string>(manager: Manager, databaseName: S): Promise<void> {
	verbose(`Dropping database`, databaseName);

	const client = await getClient(manager, BOOTSTRAP_DATABASE);
	try {
		await client.queryObject(`DROP DATABASE IF EXISTS "${databaseName}"`);
	} catch (error) {
		throw new DropDatabaseError({ originalError: error as any });
	} finally {
		await client.end();
	}

	verbose(`Dropped database`, databaseName);
}

async function isDefaultDatabaseCreated(manager: Manager): Promise<boolean> {
	for (const dbName of manager.settings.defaultDatabases) {
		if (!await databaseExists(manager, dbName)) {
			return false;
		}
	}
	return true;
}

async function createDefaultDatabase(manager: Manager): Promise<void> {
	for (const dbName of manager.settings.defaultDatabases) {
		if (!await databaseExists(manager, dbName)) {
			await createDatabase(manager, dbName);
		}
	}
}

export function getDatabaseUrl(manager: Manager, databaseName: string): string {
	assertExists(manager.state.superuserPassword, "Missing superuser password");
	assertExists(manager.state.port, "Missing port");
	return `postgresql://${BOOTSTRAP_SUPERUSER}:${manager.state.superuserPassword}@${manager.settings.host}:${manager.state.port}/${databaseName}`;
}

export async function openShell(manager: Manager, databaseName: string): Promise<void> {
	const databaseUrl = getDatabaseUrl(manager, databaseName);

	const psql = new Deno.Command(getProgramFile(manager.settings, "psql"), {
		args: [databaseUrl],
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});

	const { success } = await psql.output();
	if (!success) {
		throw new InternalError("Failed to spawn psql");
	}
}