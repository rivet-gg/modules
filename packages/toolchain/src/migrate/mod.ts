import { PostgresClient } from "./deps.ts";
import { Module, ModuleDatabase, Project } from "../project/mod.ts";
import { createOnce, Once } from "../utils/once.ts";
import { getDatabaseUrl } from "../utils/db.ts";
import { InternalError } from "../error/mod.ts";
import { getOrInitOnce } from "../utils/once.ts";
import { addShutdownHandler } from "../utils/shutdown_handler.ts";
import { verbose } from "../term/status.ts";
import { ensurePostgresRunning } from "../postgres/mod.ts";

export type ForEachDatabaseCallback = (
	opts: { module: Module; db: ModuleDatabase },
) => Promise<void>;

interface DbState {
	defaultClientOnce: Once<PostgresClient>;
	createdSchemas: Set<string>;
}

export async function getDefaultClient(_project: Project) {
	return await getOrInitOnce(DB_STATE.defaultClientOnce, async () => {
		const client = new PostgresClient(getDatabaseUrl().toString());
		await client.connect();

		addShutdownHandler(async () => {
			verbose("Shutting down default database client");
			await client.end();
		});

		return client;
	});
}

/**
 * State about the databases for the current process.
 */
const DB_STATE: DbState = {
	defaultClientOnce: createOnce(),
	createdSchemas: new Set(),
};

/** Prepares all databases and calls a callback once prepared. */
export async function forEachDatabase(
	project: Project,
	modules: Module[],
	callback: ForEachDatabaseCallback,
	signal?: AbortSignal,
) {
	signal?.throwIfAborted();

	await ensurePostgresRunning(project);

	for (const mod of modules) {
		if (!mod.db) continue;

		signal?.throwIfAborted();

		// Callback
		await callback({ module: mod, db: mod.db });
	}
}

/** Validate alphanumeric characters */
export function validateString(input: string): boolean {
	const regex = /^[a-zA-Z0-9_]+$/;
	return regex.test(input);
}

export function assertValidString(input: string): string {
	if (!validateString(input)) {
		throw new InternalError(`Invalid SQL identifier: ${input}`);
	}
	return input;
}
