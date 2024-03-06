import { Command } from "../deps.ts";
import { GlobalOpts, initProject } from "../common.ts";
import { migrateDev } from "../../migrate/dev.ts";
import { migrateStatus } from "../../migrate/status.ts";
import { migrateDeploy } from "../../migrate/deploy.ts";
import { migrateReset } from "../../migrate/reset.ts";
import { ensurePostgresRunning } from "../../utils/postgres_daemon.ts";

export const dbCommand = new Command<GlobalOpts>()
	.description("Database commands");

dbCommand.action(() => dbCommand.showHelp());

dbCommand.command("dev").option("-c, --create-only", "Create only", {
	default: false,
}).action(async (opts) => {
	const project = await initProject(opts);
	const modules = Array.from(project.modules.values())
		.filter((m) => !m.registry.isExternal);
	await ensurePostgresRunning(project);
	await migrateDev(project, modules, { createOnly: opts.createOnly });
});

dbCommand.command("status").action(async (opts) => {
	await migrateStatus(await initProject(opts));
});

dbCommand.command("reset").action(async (opts) => {
	await migrateReset(await initProject(opts));
});

dbCommand.command("deploy").action(async (opts) => {
	const project = await initProject(opts);
	await ensurePostgresRunning(project);
	await migrateDeploy(project, [...project.modules.values()]);
});

// TODO: https://github.com/rivet-gg/open-game-services-engine/issues/84
// TODO: https://github.com/rivet-gg/open-game-services-engine/issues/85
// dbCommand.command("sh").action(async () => {
// 	const cmd = await new Deno.Command("docker-compose", {
// 		args: ["exec", "-it", "postgres", "psql", "--username", "postgres"],
// 		stdin: "inherit",
// 		stdout: "inherit",
// 		stderr: "inherit",
// 	})
// 		.output();
// 	if (!cmd.success) throw new Error("Failed to sh in to database");
// });
