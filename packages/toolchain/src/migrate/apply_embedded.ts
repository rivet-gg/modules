import { resolve } from "../deps.ts";
import { runDrizzleCommand } from "../drizzle.ts";
import { dbPath, Module, Project } from "../project/mod.ts";
import { forEachDatabase } from "./mod.ts";

// TODO: Pin version
import { migrate } from "npm:drizzle-orm/pglite/migrator";
import { PGlite } from "npm:@electric-sql/pglite";
import { info } from "../term/status.ts";

export async function migrateApplyEmbedded(
	project: Project,
	modules: Module[],
	signal?: AbortSignal,
) {
	await forEachDatabase(
		project,
		modules,
		async ({ module }) => {
			info("Migrating", module.name);
			const client = new PGlite(resolve(project.path, ".opengb", "pglite"));
			await migrate(client as any, { migrationsFolder: resolve(dbPath(module), "migrations") });
		},
	);
}
