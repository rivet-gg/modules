import { CommandError, InternalError, UserError } from "./error/mod.ts";
import { dbMigrationsPath, DRIZZLE_ORM_REEXPORT } from "./project/mod.ts";
import { dbPath, Module } from "./project/module.ts";
import { Project } from "./project/project.ts";
import { verbose } from "./term/status.ts";
import { getDatabaseUrl } from "./utils/db.ts";
import { copy, dedent, relative, resolve } from "./deps.ts";
import { compileDbSchemaHelper } from "./build/gen/db_schema.ts";
import { DRIZZLE_KIT_PACKAGE, DRIZZLE_ORM_PACKAGE } from "./drizzle_consts.ts";

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
	const tempDbPath = resolve(tempDir, "db");
	const tempOrmReexportPath = resolve(tempDir, DRIZZLE_ORM_REEXPORT);

	// Copy db since we need to generate a temporary shcmea.gen.ts speicically for Drizzle Kit
	await copy(dbPath(module), tempDbPath);

	// Override helper for Drizzle Kit in NPM format
	compileDbSchemaHelper(project, module, {
		overrideDbPath: resolve(tempDbPath, "schema.gen.ts"),
		overrideOrmReexportPath: tempOrmReexportPath,
		forceNodeModules: true,
	});

	// Write script that will re-export both the tables and the schema.
	//
	// See https://github.com/drizzle-team/drizzle-orm/issues/2632#issuecomment-2307480756
	const schemaReexportSource = dedent`
  export * from "./db/schema.ts";
  // Rename in order to prevent conflicts with schemas exported from schema.ts
  export { schema as __schema } from "./db/schema.gen.ts";
  `;
	await Deno.writeTextFile(resolve(tempDir, "schema_reexport.ts"), schemaReexportSource);

	// Write Drizzle config
	await Deno.writeTextFile(
		resolve(tempDir, "database.config.json"),
		JSON.stringify({
			// Use the copied schema.ts
			schema: "./schema_reexport.ts",
			// Update migrations in-place in the project
			//
			// Drizzle Kit does not play nice with absolute paths
			out: relative(tempDbPath, dbMigrationsPath(module)),
			dialect: "postgresql",
			migrations: {
				table: "migrations",
				prefix: "unix",
			},
			dbCredentials: {
				url: getDatabaseUrl(),
			},
			verbose: Deno.env.get("VERBOSE") == "1",
			schemaFilter: [module.db.schema],
		}),
	);

	verbose("Running Drizzle command", tempDir);

	// Install dependencies
	//
	// This uses node_modules since drizzle-kit depends on being able to import `drizzle-orm`.
	const denoCache = await new Deno.Command("deno", {
		args: ["cache", "--node-modules-dir", DRIZZLE_ORM_PACKAGE, DRIZZLE_KIT_PACKAGE, "npm:pg@8.11.3"],
		cwd: tempDir,
		signal,
	}).output();
	if (!denoCache.success) {
		throw new CommandError(`Failed to run: deno cache`, { commandOutput: denoCache });
	}

	// Run drizzle-kit
	const drizzleOutput = await new Deno.Command("deno", {
		// TODO: Specify drizzle version
		args: ["run", "-A", "--node-modules-dir", DRIZZLE_KIT_PACKAGE, "--config", "database.config.json", ...opts.args],
		cwd: tempDir,
		stdin: opts.interactive ? "inherit" : undefined,
		stdout: opts.output ? "inherit" : undefined,
		stderr: opts.output ? "inherit" : undefined,
		signal,
	}).output();
	if (!drizzleOutput.success) {
		throw new CommandError(`Failed to run: drizzle-kit ${opts.args.join(" ")}`, { commandOutput: drizzleOutput });
	}

	if (!opts.output) {
		// HACK: Drizzle Kit doesn't always output the correct status code, so we have to read the output
		const drizzleStderr = new TextDecoder().decode(drizzleOutput.stderr);
		const hasError = drizzleStderr.split("\n").findIndex((x) => x.startsWith("error:")) != -1;
		if (hasError) {
			throw new CommandError(`Failed to run: drizzle-kit ${opts.args.join(" ")}`, { commandOutput: drizzleOutput });
		}

		if (Deno.env.get("VERBOSE") == "1") {
			const drizzleStdout = new TextDecoder().decode(drizzleOutput.stdout);
			verbose("Drizzle stdout");
			console.log(drizzleStdout);

			verbose("Drizzle stderr");
			console.log(drizzleStderr);
		}
	}
}
