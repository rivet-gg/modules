import { copy, resolve } from "../deps.ts";
import { dedent, PostgresClient } from "./deps.ts";
import { Module, ModuleDatabase, Project } from "../project/mod.ts";
import { assertValidString } from "./validate.ts";
import { emptyDir } from "../deps.ts";

const PRISMA_VERSION = "5.9.1";

export type ForEachDatabaseCallback = (
	opts: { databaseUrl: string; module: Module; db: ModuleDatabase },
) => Promise<void>;
export type ForEachPrismaSchemaCallback = (
	opts: {
		databaseUrl: string;
		module: Module;
		db: ModuleDatabase;
		tempDir: string;
		generatedClientDir: string;
	},
) => Promise<void>;

/** Prepares all databases and calls a callback once prepared. */
export async function forEachDatabase(
	_project: Project,
	modules: Module[],
	callback: ForEachDatabaseCallback,
) {
	// Setup database
	const defaultDatabaseUrl = Deno.env.get("DATABASE_URL") ??
		"postgres://postgres:postgres@localhost:5432/postgres";

	// Create client that connects to the default database
	const defaultClient = new PostgresClient(defaultDatabaseUrl);
	await defaultClient.connect();

	try {
		for (const mod of modules) {
			if (!mod.db) continue;

			// Create database
			await createDatabases(defaultClient, mod.db);

			// Build URL
			const urlParsed = new URL(defaultDatabaseUrl);
			urlParsed.pathname = `/${mod.db.name}`;
			const databaseUrl = urlParsed.toString();

			// Callback
			await callback({ databaseUrl, module: mod, db: mod.db });
		}
	} catch (cause) {
		throw new Error("Failed to iterate databases", { cause });
	} finally {
		await defaultClient.end();
	}
}

/** Prepares the Postgres database & creates a temporary Prisma project for each database. */
export async function forEachPrismaSchema(
	project: Project,
	modules: Module[],
	callback: ForEachPrismaSchemaCallback,
) {
	await forEachDatabase(
		project,
		modules,
		async ({ databaseUrl, module, db }) => {
			const prismaDir = await preparePrismaWorkspace(project);

			const srcDbDir = resolve(module.path, "db");
			const dstDbDir = resolve(prismaDir, "db");
			const generatedClientDir = resolve(
				module.path,
				"_gen",
				"prisma",
			);

			// Copy db directory
			await emptyDir(dstDbDir);
			await copy(srcDbDir, dstDbDir, { overwrite: true });

			// Append generator config
			const schemaPath = resolve(dstDbDir, "schema.prisma");
			let schema = await Deno.readTextFile(schemaPath);
			schema += dedent`
				generator client {
					provider = "prisma-client-js"
					output = "${generatedClientDir}"
					previewFeatures = ["driverAdapters"]
				}
			`;
			await Deno.writeTextFile(schemaPath, schema);

			// Callback
			await callback({ databaseUrl, module, db, tempDir: prismaDir, generatedClientDir });
		},
	);
}

/**
 * Create databases for a module.
 */
async function createDatabases(client: PostgresClient, db: ModuleDatabase) {
	// Create database
	const existsQuery = await client.queryObject<
		{ exists: boolean }
	>`SELECT EXISTS (SELECT FROM pg_database WHERE datname = ${db.name})`;
	if (!existsQuery.rows[0].exists) {
		await client.queryObject(`CREATE DATABASE ${assertValidString(db.name)}`);
	}
}

/**
 * Context about the Prisma workspace for the current command.
 */
const PRISMA_WORKSPACE_STATE = {
	didRunInstall: false,
};

/**
 * Installs a copy of Prisma in to a directory that can be reused for any
 * Prisma-related commands.
 */
async function preparePrismaWorkspace(project: Project): Promise<string> {
	const prismaDir = resolve(project.path, "_gen", "prisma_workspace");
	await Deno.mkdir(prismaDir, { recursive: true });

	if (!PRISMA_WORKSPACE_STATE.didRunInstall) {
		// Write package.json
		const packageJson = JSON.stringify({
			"devDependencies": {
				"prisma": `^${PRISMA_VERSION}`,
			},
			"dependencies": {
				"@prisma/client": `^${PRISMA_VERSION}`,
			},
			"node": {
				"target": "20.11.1",
			},
		});
		await Deno.writeTextFile(resolve(prismaDir, "package.json"), packageJson);

		// Install dependencies
		const installOutput = await new Deno.Command("npm", {
			args: ["install", "--prefer-offline", "--no-audit", "--no-fund", "--progress=false"],
			cwd: prismaDir,
			stdout: "inherit",
			stderr: "inherit",
		}).output();
		if (!installOutput.success) throw new Error("Failed to install prisma dependencies");

		PRISMA_WORKSPACE_STATE.didRunInstall = true;
	}

	return prismaDir;
}

export interface RunPrismaCommandOpts {
	args: string[];
	env: Record<string, string>;
}

/**
 * Run a Prisma command in the Prisma workspace.
 *
 * We don't use `deno run npm:prisma` because:
 *
 * - We already have Prisma installed in the workspace
 * - There are minor bugs with Deno's compatability with Prisma
 */
export async function runPrismaCommand(
	project: Project,
	opts: RunPrismaCommandOpts & Deno.CommandOptions,
) {
	const prismaDir = resolve(project.path, "_gen", "prisma_workspace");
	const status = await new Deno.Command("npx", {
		args: ["prisma", ...opts.args],
		cwd: resolve(prismaDir, "db"),
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
		env: opts.env,
	}).output();
	if (!status.success) {
		throw new Error(`Failed to run: prisma ${opts.args.join(" ")}`);
	}
}
