import { Command } from "@cliffy/command";
import { GlobalOpts, initProject } from "../../common.ts";
import { UserError } from "../../../toolchain/error/mod.ts";
import { migrateGenerate } from "../../../toolchain/migrate/generate.ts";
import { migratePush } from "../../../toolchain/migrate/push.ts";
import { migrateApply } from "../../../toolchain/migrate/apply.ts";
import { resolveModules } from "../../util.ts";
import { migrateDrop } from "../../../toolchain/migrate/drop.ts";

export const migrateCommand = new Command<GlobalOpts>()
	.description("Manage database migrations");

migrateCommand.action(() => migrateCommand.showHelp());

migrateCommand
	.command("generate")
	.description("Generates SQL migrations for your schema")
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

migrateCommand
	.command("apply")
	.description("Runs SQL migrations for your schema")
	.arguments("[...modules:string]")
	.action(async (opts, ...moduleNames: string[]) => {
		const project = await initProject(opts);
		const modules = resolveModules(project, moduleNames);

		await migrateApply(project, modules);
	});

migrateCommand
	.command("push")
	.description("Pushes your schema to the database (for development only)")
	.arguments("[...modules:string]")
	.action(async (opts, ...moduleNames: string[]) => {
		const project = await initProject(opts);
		const modules = resolveModules(project, moduleNames);

		await migratePush(project, modules);
	});

migrateCommand
	.command("drop")
	.description("Removes a migration file")
	.arguments("[...modules:string]")
	.action(async (opts, ...moduleNames: string[]) => {
		const project = await initProject(opts);
		const modules = resolveModules(project, moduleNames);

		await migrateDrop(project, modules);
	});
