import { Command } from "../../deps.ts";
import { GlobalOpts, initProject } from "../../common.ts";
import { UserError } from "../../../../toolchain/src/error/mod.ts";
import { verbose, warn } from "../../../../toolchain/src/term/status.ts";
import { migrateCommand } from "./migrate.ts";
import { dbReset } from "../../../../toolchain/src/migrate/reset.ts";
import { resolveModules } from "../../util.ts";
import { instanceCommand } from "./instance.ts";
import { getDefaultDatabaseUrl } from "../../../../toolchain/src/postgres/mod.ts";

export const POSTGRES_IMAGE = "postgres:16.2-alpine3.19";
// Unique container name for this runtime so we can run multiple instances in
// parallel
export const POSTGRES_CONTAINER_NAME = `opengb-postgres-${Deno.pid}`;

export const dbCommand = new Command<GlobalOpts>()
	.description("Database commands");

dbCommand.action(() => dbCommand.showHelp());

dbCommand.command("migrate", migrateCommand);
dbCommand.command("instance", instanceCommand);

if (Deno.env.get("RIVET_CLI_PASSTHROUGH") != undefined) {
	dbCommand
		.globalOption("--env <environment:string>", "Managed OpenGB environment used by the Rivet CLI")
		.action(() => dbCommand.showHelp());
} else {
	dbCommand
		.action(() => dbCommand.showHelp());
}

dbCommand
	.command("reset")
	.description("Deletes all data in a module's database")
	.arguments("[...modules:string]")
	.action(async (opts, ...moduleNames: string[]) => {
		const project = await initProject(opts);
		const modules = resolveModules(project, moduleNames);

		await dbReset(project, modules);
	});

dbCommand
	.command("sh")
	.action(async (opts) => {
		const project = await initProject(opts);

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
				await getDefaultDatabaseUrl(project),
			],
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		}).output();
	});

dbCommand
	.command("url")
	.action(async (opts) => {
		const project = await initProject(opts);
		const dbUrl = await getDefaultDatabaseUrl(project);
		console.log(dbUrl);
	});
