import {
	CreateDatabaseError,
	DatabaseExistsError,
	DatabaseInitializationError,
	DatabaseStartError,
	DatabaseStopError,
	DropDatabaseError,
} from "./error.ts";
import { binaryDir, BOOTSTRAP_DATABASE, BOOTSTRAP_SUPERUSER, Settings, url as settingsUrl } from "./settings.ts";
import { verbose } from "../term/status.ts";
import { addShutdownHandler } from "../utils/shutdown_handler.ts";
import { PostgresClient } from "../migrate/deps.ts";
import { dirname, ensureDir, exists, move, resolve } from "../deps.ts";
import { execute } from "./command.ts";
import { getDownloadUrl, getReleaseFileNameForCurrentHost } from "./resolver.ts";
import { InternalError } from "../error/mod.ts";
import * as tar from "npm:tar";

export enum Status {
	NotInstalled,
	Installed,
	Started,
	Stopped,
}

export interface Manager {
	settings: Settings;
}

export function createManager(settings: Settings): Manager {
	settings.installationDir = resolve(settings.installationDir, settings.version);
	return { settings };
}

export async function status(manager: Manager): Promise<Status> {
	if (await isRunning(manager)) {
		return Status.Started;
	} else if (await isInitialized(manager)) {
		return Status.Stopped;
	} else if (await isInstalled(manager)) {
		return Status.Installed;
	} else {
		return Status.NotInstalled;
	}
}

export async function isInstalled(manager: Manager): Promise<boolean> {
	const path = manager.settings.installationDir;
	return path.endsWith(manager.settings.version.toString()) && await exists(path);
}

export async function isInitialized(manager: Manager): Promise<boolean> {
	return await exists(manager.settings.dataDir.concat("/postgresql.conf"));
}

export async function isRunning(manager: Manager): Promise<boolean> {
	const pidFile = manager.settings.dataDir.concat("/postmaster.pid");
	return await exists(pidFile);
}

export async function setup(manager: Manager): Promise<void> {
	if (!await isInstalled(manager)) {
		await install(manager);
	}
	if (!await isInitialized(manager)) {
		await initialize(manager);
	}
}

export async function install(manager: Manager): Promise<void> {
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

export async function initialize(manager: Manager): Promise<void> {
	if (!await exists(manager.settings.passwordFile)) {
		await Deno.writeTextFile(manager.settings.passwordFile, manager.settings.password);
	}

	verbose(`Initializing Postgres`, manager.settings.dataDir);

	try {
		await execute({
			program: "initdb",
			programDir: binaryDir(manager.settings),
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

export async function start(manager: Manager): Promise<void> {
	if (manager.settings.port === 0) {
		// Choose available port
		const listener = Deno.listen({ port: 0 });
		const { port } = listener.addr as Deno.NetAddr;
		manager.settings.port = port;
		listener.close();

		// Start server
		try {
			const startLog = manager.settings.dataDir.concat("/start.log");

			const options = [];
			options.push(`-F -p ${manager.settings.port}`);
			for (const [k, v] of Object.entries(manager.settings.configuration)) {
				options.push(`-c ${k}=${v}`);
			}

			await execute({
				program: "pg_ctl",
				programDir: binaryDir(manager.settings),
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
			verbose(`Started database ${manager.settings.dataDir} on port ${manager.settings.port}`);
		} catch (error) {
			throw new DatabaseStartError({ originalError: error as any });
		}
	}
}

export async function stop(manager: Manager): Promise<void> {
	verbose(`Stopping database ${manager.settings.dataDir}`);

	try {
		await execute({
			program: "pg_ctl",
			programDir: binaryDir(manager.settings),
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

export async function getClient(manager: Manager): Promise<PostgresClient> {
	const settings = { ...manager.settings };
	settings.username = BOOTSTRAP_SUPERUSER;
	const databaseUrl = settingsUrl(settings, BOOTSTRAP_DATABASE);

	const client = new PostgresClient(databaseUrl);
	await client.connect();

	addShutdownHandler(async () => {
		verbose("Shutting down default database client");
		await client.end();
	});

	return client;
}

export async function createDatabase<S extends string>(manager: Manager, databaseName: S): Promise<void> {
	verbose(`Creating database ${databaseName} for ${manager.settings.host}:${manager.settings.port}`);

	const client = await getClient(manager);
	try {
		await client.queryObject(`CREATE DATABASE "${databaseName}"`);
	} catch (error) {
		throw new CreateDatabaseError({ originalError: error as any });
	} finally {
		await client.end();
	}

	verbose(`Created database ${databaseName} for ${manager.settings.host}:${manager.settings.port}`);
}

export async function databaseExists<S extends string>(manager: Manager, databaseName: S): Promise<boolean> {
	verbose(`Checking if database ${databaseName} exists for ${manager.settings.host}:${manager.settings.port}`);

	const client = await getClient(manager);
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
	verbose(`Dropping database ${databaseName} for ${manager.settings.host}:${manager.settings.port}`);

	const client = await getClient(manager);
	try {
		await client.queryObject(`DROP DATABASE IF EXISTS "${databaseName}"`);
	} catch (error) {
		throw new DropDatabaseError({ originalError: error as any });
	} finally {
		await client.end();
	}

	verbose(`Dropped database ${databaseName} for ${manager.settings.host}:${manager.settings.port}`);
}
