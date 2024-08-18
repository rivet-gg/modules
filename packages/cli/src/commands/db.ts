import { Command } from "../deps.ts";
import { GlobalOpts, initProject } from "../common.ts";
import { UserError } from "../../../toolchain/src/error/mod.ts";
import { Project } from "../../../toolchain/src/project/mod.ts";
import { verbose, warn } from "../../../toolchain/src/term/status.ts";
import { getDatabaseUrl } from "../../../toolchain/src/utils/db.ts";
import { migrateGenerate } from "../../../toolchain/src/migrate/generate.ts";
import { migratePush } from "../../../toolchain/src/migrate/push.ts";
import { migrateApply } from "../../../toolchain/src/migrate/apply.ts";

export const POSTGRES_IMAGE = "postgres:16.2-alpine3.19";
// Unique container name for this runtime so we can run multiple instances in
// parallel
export const POSTGRES_CONTAINER_NAME = `opengb-postgres-${Deno.pid}`;

export const dbCommand = new Command<GlobalOpts>()
	.description("Database commands");

if (Deno.env.get("RIVET_CLI_PASSTHROUGH") != undefined) {
	dbCommand
		.globalOption("--env <environment:string>", "Managed OpenGB environment used by the Rivet CLI")
		.action(() => dbCommand.showHelp());
} else {
	dbCommand
		.action(() => dbCommand.showHelp());
}

dbCommand
	.command("generate")
	.arguments("[...modules:string]")
	.action(async (opts, ...moduleNames: string[]) => {
		const project = await initProject(opts);
		const modules = resolveModules(project, moduleNames);

		// Validate modules
		for (const module of modules) {
			if (module.registry.isExternal) {
				throw new UserError(`Cannot run this command against external module: ${module.name}`);
			}
		}

		await migrateGenerate(project, modules);
	});

dbCommand
	.command("apply")
	.arguments("[...modules:string]")
	.action(async (opts, ...moduleNames: string[]) => {
		const project = await initProject(opts);
		const modules = resolveModules(project, moduleNames);

		await migrateApply(project, modules);
	});

// TODO: drop entire database
dbCommand
	.command("push")
	.arguments("[...modules:string]")
	.action(async (opts, ...moduleNames: string[]) => {
		const project = await initProject(opts);
		const modules = resolveModules(project, moduleNames);

		await migratePush(project, modules);
	});

dbCommand
	.command("sh")
	.action(async (opts) => {
		// Validate terminal
		if (!Deno.stdin.isTerminal()) {
			throw new UserError("Cannot run this command without a terminal.", {
				suggest:
					"This is likely because you're running from a non-interactive shell, such as a CI environment. Run this command in a terminal that supports TTY.",
			});
		}

		// Warn if tyring to run inside of Docker
		if (Deno.env.has("RUNNING_IN_DOCKER")) {
			warn("Skipping Postgres Dev Server", "Cannot start Postgres dev server when running OpenGB inside of Docker");
			return;
		}

		const project = await initProject(opts);

		const dbUrl = getDatabaseUrl();
		if (dbUrl.hostname == "localhost" || dbUrl.hostname == "0.0.0.0" || dbUrl.hostname == "127.0.0.1") {
			dbUrl.hostname = "host.docker.internal";
		}

		// Start the container
		verbose("Starting container", `${POSTGRES_CONTAINER_NAME} (${POSTGRES_IMAGE})`);
		await new Deno.Command("docker", {
			args: [
				"run",
				"-it",
				"--rm",
				`--name=${POSTGRES_CONTAINER_NAME}`,
				"--add-host=host.docker.internal:host-gateway",
				POSTGRES_IMAGE,
				// ===
				"psql",
				dbUrl.toString(),
			],
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		}).output();
	});

dbCommand
	.command("url")
	.action(async () => {
		const dbUrl = getDatabaseUrl().toString();

		await Deno.stdout.write(new TextEncoder().encode(dbUrl));
		console.error("");
	});

function resolveModules(project: Project, moduleNames: string[]) {
	if (moduleNames.length > 0) {
		return moduleNames.map((name) => {
			const module = project.modules.get(name);
			if (!module) throw new UserError(`Module not found: ${name}`);
			return module;
		});
	} else {
		return Array.from(project.modules.values());
	}
}
