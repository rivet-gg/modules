import { copy, exists, resolve } from "../deps.ts";
import { dedent } from "./deps.ts";
import { Module, Project } from "../project/mod.ts";
import { CommandError, UserError } from "../error/mod.ts";
import { verbose } from "../term/status.ts";
import { createOnce, getOrInitOnce } from "../utils/once.ts";
import { genPath, PRISMA_WORKSPACE_PATH } from "../project/project.ts";
import prismaArchive from "../../artifacts/prisma_archive.json" with { type: "json" };
import { inflateArchive } from "../build/util.ts";

export const PRISMA_VERSION = "5.15.0";
const PRISMA_BIN_NAME = `opengb_prisma_${PRISMA_VERSION.replace(/\./g, "_")}`;

const PRISMA_DEFAULT_ENV = {
	DEBUG: Deno.env.get("VERBOSE") ? "*" : "",

	// Disable Prisma features
	PRISMA_HIDE_UPDATE_MESSAGE: "true",

	// Disable dependency on NodeJS
	//
	// We archive the node modules and inflate them manually. See `build_prisma_archive.ts`.
	PRISMA_GENERATE_SKIP_AUTOINSTALL: "true",
	PRISMA_SKIP_POSTINSTALL_GENERATE: "true",

	// Force binary since running Prisma in Deno doesn't work with Node dylibs
	PRISMA_CLI_QUERY_ENGINE_TYPE: "binary",
};

function getPrismaDir(project: Project) {
	return genPath(project, PRISMA_WORKSPACE_PATH);
}

const PRISMA_INSTALLED_ONCE = createOnce<void>();

/**
 * Compiles a copy of the Prisma CLI for future use.
 */
export async function ensurePrismaInstalled(signal?: AbortSignal): Promise<void> {
	return await getOrInitOnce(PRISMA_INSTALLED_ONCE, async () => {
		return await ensurePrismaInstalledInner(signal);
	});
}

async function ensurePrismaInstalledInner(signal?: AbortSignal): Promise<void> {
	const prismaEnv = {
		// This db url is intentionally invalid in order to not accidentally try
		// and connect to a real database.
		DATABASE_URL: "postgresql://postgres:postgres@192.0.2.1.host:5432/postgres",
		...PRISMA_DEFAULT_ENV,
	};

	// Check if already installed
	try {
		const versionCommand = await new Deno.Command(PRISMA_BIN_NAME, {
			args: ["--version"],
			env: prismaEnv,
		}).output();
		if (versionCommand.success) {
			verbose(`Prisma ${PRISMA_VERSION} already installed`);
			return;
		} else {
			verbose("Prisma command failed", versionCommand.code.toString());
		}
	} catch (err) {
		verbose("Prisma not installed", err);
	}

	// HACK: --no-lock fixes a weird bug that causes `Argument list too lock` as of Deno 1.44.1.
	//
	// HACK: `deno compile` causes a bug that makes Prisma freeze, so we need to
	// install it as a global binary
	verbose(`Installing Prisma ${PRISMA_VERSION} as ${PRISMA_BIN_NAME}`);
	const isVerbose = Deno.env.has("VERBOSE");
	const prismaOutput = await new Deno.Command("deno", {
		args: [
			"install",
			"--global",
			"--no-lock",
			"--name",
			PRISMA_BIN_NAME,
			"-A",
			// Overwrite installation in case something went wrong in detecting the
			// current installation
			"--force",
			`npm:prisma@${PRISMA_VERSION}`,
		],
		stdout: isVerbose ? "inherit" : undefined,
		stderr: isVerbose ? "inherit" : undefined,
		env: prismaEnv,
		signal,
	}).output();
	if (!prismaOutput.success) {
		throw new CommandError(`Failed to install Prisma`, { commandOutput: prismaOutput });
	}

	// Pre-downlaod engines in order to prevent race condition with multiple
	// instances of Prisma trying to install the engines at the same time.
	verbose("Predownloading engines");
	const tempDir = await Deno.makeTempDir();

	const prismaInit = await new Deno.Command(PRISMA_BIN_NAME, {
		args: ["init"],
		stdout: isVerbose ? "inherit" : undefined,
		stderr: isVerbose ? "inherit" : undefined,
		env: prismaEnv,
		cwd: tempDir,
		signal,
	}).output();
	if (!prismaInit.success) {
		throw new CommandError(`Failed to run: prisma version`, { commandOutput: prismaInit });
	}

	// Run db command to pull query engine.
	//
	// Ignore the status of _prismaStatus, since this will intentionally fail.
	// It's meant to download the query engines so the next time we run a query,
	// it's fast.
	const _prismaStatus = await new Deno.Command(PRISMA_BIN_NAME, {
		args: ["migrate", "status"],
		stdout: isVerbose ? "inherit" : undefined,
		stderr: isVerbose ? "inherit" : undefined,
		env: prismaEnv,
		cwd: tempDir,
		signal,
	}).output();

	await Deno.remove(tempDir, { recursive: true });

	verbose(`Prisma ${PRISMA_VERSION} installed`);
}

export interface RunPrismaCommandOpts {
	args: string[];
	env: Record<string, string>;
	interactive: boolean;
	output: boolean;
	signal?: AbortSignal;
}
/**
 * Run a Prisma command in the Prisma workspace. The CWD is set to the `db`
 * directory.
 *
 * We don't use `deno run npm:prisma` because:
 *
 * - We already have Prisma installed in the workspace
 * - There are minor bugs with Deno's compatibility with Prisma
 */

export async function runPrismaCommand(
	project: Project,
	module: Module,
	opts: RunPrismaCommandOpts,
): Promise<string> {
	await ensurePrismaInstalled(opts.signal);

	// Validate terminal
	if (opts.interactive && !Deno.stdin.isTerminal()) {
		throw new UserError("Cannot run this command without a terminal.", {
			suggest:
				"This is likely because you're running from a non-interactive shell, such as a CI environment. Run this command in a terminal that supports TTY.",
		});
	}

	const signal = opts.signal;

	// Unique isolated folder for this command to run in. This runs in the Prisma
	// workspace where Prisma is already installed.
	const prismaDir = getPrismaDir(project);
	const workspaceId = crypto.randomUUID();
	const dbDir = resolve(prismaDir, "db", workspaceId);
	await Deno.mkdir(dbDir, { recursive: true });
	verbose("Setting up Prisma command dir", dbDir);

	// Writes a copy of the OpenGB runtime bundled with the CLI to the project.
	const inflatePrismaPath = resolve(dbDir, "node_modules");
	if (await exists(inflatePrismaPath, { isDirectory: true })) {
		await Deno.remove(inflatePrismaPath, { recursive: true });
	}
	await inflateArchive(prismaArchive, inflatePrismaPath, "base64", signal);

	// Copy database
	await copy(resolve(module.path, "db"), dbDir, { overwrite: true });

	// Append generator config
	const schemaPath = resolve(dbDir, "schema.prisma");
	let schema = await Deno.readTextFile(schemaPath);
	schema += dedent`
		// Generated by Open Game Backend
		generator client {
			provider = "prisma-client-js"
			output = "${dbDir}/client"
			previewFeatures = ["driverAdapters"]
		}
	`;
	await Deno.writeTextFile(schemaPath, schema);

	Object.assign(opts.env, PRISMA_DEFAULT_ENV);

	// Run the command
	//
	// HACK: --no-lock fixes a weird bug that causes `Argument list too lock` as of Deno 1.44.1.
	verbose("Running Prisma command", `${dbDir}: ${PRISMA_BIN_NAME} ${opts.args.join(" ")}`);
	const prismaOutput = await new Deno.Command(PRISMA_BIN_NAME, {
		args: opts.args,
		cwd: dbDir,
		stdin: opts.interactive ? "inherit" : undefined,
		stdout: opts.output ? "inherit" : undefined,
		stderr: opts.output ? "inherit" : undefined,
		env: opts.env,
		signal,
	}).output();
	if (!prismaOutput.success) {
		throw new CommandError(`Failed to run: prisma ${opts.args.join(" ")}`, { commandOutput: prismaOutput });
	}

	// TODO: Clean up the workspace?
	return dbDir;
}
