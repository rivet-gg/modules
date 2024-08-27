import { Command } from "@cliffy/command";
import { GlobalOpts, initProject } from "../../common.ts";
import { getDefaultPostgresManager } from "../../../toolchain/postgres/mod.ts";
import { Manager, setup, status, stop } from "../../../toolchain/postgres/manager.ts";
import { Status } from "../../../toolchain/postgres/manager.ts";
import { info, success, warn } from "../../../toolchain/term/status.ts";
import { Project } from "../../../toolchain/project/project.ts";
import { UnreachableError } from "../../../toolchain/error/mod.ts";

async function withPostgresManager(project: Project, callback: (manager: Manager) => Promise<void>) {
	const manager = await getDefaultPostgresManager(project);
	if (manager) {
		await callback(manager);
	} else {
		warn("Postgres is disabled");
	}
}

export const instanceCommand = new Command<GlobalOpts>()
	.description("Manage the Postgres instance");

instanceCommand.action(() => instanceCommand.showHelp());

instanceCommand
	.command("start")
	.description("Start the Postgres instance")
	.action(async (opts) => {
		const project = await initProject(opts);
		await withPostgresManager(project, async (manager) => {
			await setup(manager);
			success("Postgres instance started");
		});
	});

instanceCommand
	.command("stop")
	.description("Stop the Postgres instance")
	.action(async (opts) => {
		const project = await initProject(opts);
		await withPostgresManager(project, async (manager) => {
			await stop(manager);
			success("Postgres instance stopped");
		});
	});

instanceCommand
	.command("status")
	.description("Check the status of the Postgres instance")
	.action(async (opts) => {
		const project = await initProject(opts);
		await withPostgresManager(project, async (manager) => {
			let statusText: string;
			const currentStatus = await status(manager);
			if (currentStatus === Status.NotInstalled) {
				statusText = "Not installed";
			} else if (currentStatus === Status.Installed) {
				statusText = "Installed";
			} else if (currentStatus === Status.Initialized) {
				statusText = "Initialized";
			} else if (currentStatus === Status.DefaultDatabaseNotCreated) {
				statusText = "Default database not created";
			} else if (currentStatus === Status.Stopped) {
				statusText = "Stopped";
			} else if (currentStatus === Status.Started) {
				statusText = "Started";
			} else {
				throw new UnreachableError(currentStatus);
			}
			info("Status", statusText);
		});
	});
