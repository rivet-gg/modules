import { Module, ModuleDatabase, Project } from "../project/mod.ts";
import { InternalError } from "../error/mod.ts";
import { ensurePostgresRunning } from "../postgres/mod.ts";
import { verbose } from "../term/status.ts";

export type ForEachDatabaseCallback = (
	opts: { module: Module; db: ModuleDatabase },
) => Promise<void>;

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
		verbose("Running callback for database", mod.name);
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
