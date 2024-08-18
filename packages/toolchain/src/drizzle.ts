import { CommandError, InternalError, UserError } from "./error/mod.ts";
import { dbMigrationsPath } from "./project/mod.ts";
import { dbPath, dbSchemaPath, Module } from "./project/module.ts";
import { Project } from "./project/project.ts";
import { verbose } from "./term/status.ts";
import { getDatabaseUrl } from "./utils/db.ts";
import { copy, resolve } from "./deps.ts";
import { compileDbSchemaHelper } from "./build/gen/db_schema.ts";

// See also packages/runtime/src/postgres.ts
export const DRIZZLE_ORM_PACKAGE = "npm:drizzle-orm@0.33.0";
export const DRIZZLE_KIT_PACKAGE = "npm:drizzle-kit@0.24.0";

// Package names without the Deno namespaces. These are used when having Drizzle introspect the schema.
export const DRIZZLE_ORM_PACKAGE_NPM = "drizzle-orm";
export const DRIZZLE_KIT_PACKAGE_NPM = "drizzle-kit";

export interface RunCommandOpts {
	args: string[];
	interactive: boolean;
	output: boolean;
	signal?: AbortSignal;
}

export async function runDrizzleCommand(project: Project, module: Module, opts: RunCommandOpts) {
	if (!module.db) {
		throw new InternalError("Running drizzle command on module without db");
	}

	// Validate terminal
	if (opts.interactive && !Deno.stdin.isTerminal()) {
		throw new UserError("Cannot run this command without a terminal.", {
			suggest:
				"This is likely because you're running from a non-interactive shell, such as a CI environment. Run this command in a terminal that supports TTY.",
		});
	}

	const signal = opts.signal;

	// Build working dir
	const tempDir = await Deno.makeTempDir();

	// Copy db since we need to generate a temporary shcmea.gen.ts speicically for Drizzle Kit
	await copy(dbPath(module), resolve(tempDir, "db"));

	// Override helper for Drizzle Kit in NPM format.
	compileDbSchemaHelper(project, module, {
		overridePath: resolve(tempDir, "db", "schema.gen.ts"),
		forceNodeModules: true,
	});

	// Write Drizzle config
	await Deno.writeTextFile(
		resolve(tempDir, "drizzle.config.json"),
		JSON.stringify({
			// Use the copied schema.ts
			schema: "./db/schema.ts",
			// Update migrations in-place
			out: dbMigrationsPath(module),
			dialect: "postgresql",
			migrations: {
				table: "migrations",
				prefix: "unix",
			},
			dbCredentials: {
				url: getDatabaseUrl(),
			},
			verbose: Deno.env.get("VERBOSE") == "1",
			// schemaFilter: [module.db.schema],
		}),
	);

	verbose("Running Drizzle command", tempDir);

	// Install dependencies
	//
	// This uses node_modules since drizzle-kit depends on being able to import `drizzle-orm`.
	const denoCache = await new Deno.Command("deno", {
		args: ["cache", "--node-modules-dir", DRIZZLE_ORM_PACKAGE, DRIZZLE_KIT_PACKAGE],
		cwd: tempDir,
		signal,
	}).output();
	if (!denoCache.success) {
		throw new CommandError(`Failed to run: deno cache`, { commandOutput: denoCache });
	}

	// Run drizzle-kit
	const drizzleOutput = await new Deno.Command("deno", {
		// TODO: Specify drizzle version
		args: ["run", "-A", "--node-modules-dir", DRIZZLE_KIT_PACKAGE, ...opts.args],
		cwd: tempDir,
		stdin: opts.interactive ? "inherit" : undefined,
		stdout: opts.output ? "inherit" : undefined,
		stderr: opts.output ? "inherit" : undefined,
		signal,
	}).output();
	if (!drizzleOutput.success) {
		throw new CommandError(`Failed to run: drizzle-kit ${opts.args.join(" ")}`, { commandOutput: drizzleOutput });
	}
}
