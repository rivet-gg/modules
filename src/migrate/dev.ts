// Generates & deploys SQL migrations. See `deploy.ts` to only deploy migrations.
//
// Wrapper around `prisma migrate dev`

import { assert, copy, emptyDir, exists, resolve } from "../deps.ts";
import { Module, Project } from "../project/mod.ts";
import { forEachPrismaSchema } from "./mod.ts";

export interface MigrateDevOpts {
	createOnly: boolean;
}

export async function migrateDev(
	project: Project,
	modules: Module[],
	opts: MigrateDevOpts,
) {
	assert(modules.every(m => ("local" in m.registry.config)), "Only local modules can run migrateDev because it generates migration files");

	await forEachPrismaSchema(
		project,
		modules,
		async ({ databaseUrl, module, tempDir }) => {
			// Generate migrations & client
			const status = await new Deno.Command("deno", {
				args: [
					"run",
					"-A",
					"npm:prisma@5.9.1",
					"migrate",
					"dev",
					"--skip-generate",
					...(opts.createOnly ? ["--create-only"] : []),
				],
				cwd: tempDir,
				stdin: "inherit",
				stdout: "inherit",
				stderr: "inherit",
				env: {
					DATABASE_URL: databaseUrl,
				},
			}).output();
			if (!status.success) {
				throw new Error("Failed to generate migrations");
			}

			// Copy back migrations dir
			//
			// Copy for both `path` (that we'll use later in this script) and
			// `sourcePath` (which is the original module's source)
			const tempMigrationsDir = resolve(tempDir, "migrations");
			if (await exists(tempMigrationsDir)) {
				const migrationsDir = resolve(module.path, "db", "migrations");
				await emptyDir(migrationsDir);
				await copy(tempMigrationsDir, migrationsDir, { overwrite: true });

				const sourceMigrationsDir = resolve(module.sourcePath, "db", "migrations");
				await emptyDir(sourceMigrationsDir);
				await copy(tempMigrationsDir, sourceMigrationsDir, { overwrite: true });
			}
		},
	);
}
