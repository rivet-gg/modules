import { Module, Project } from "../project/mod.ts";
import { forEachDatabase } from "./mod.ts";
import { info } from "../term/status.ts";
import { assertValidString } from "./mod.ts";
import { getDefaultClient } from "../postgres/mod.ts";

export async function dbReset(
	project: Project,
	modules: Module[],
	_signal?: AbortSignal,
) {
	await forEachDatabase(
		project,
		modules,
		async ({ module, db }) => {
			const client = await getDefaultClient(project);
			info("Resetting", module.name);
			await client.queryObject(`DROP SCHEMA IF EXISTS ${assertValidString(db.schema)} CASCADE`);
		},
	);
}
