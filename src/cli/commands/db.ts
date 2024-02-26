import { Command } from "../deps.ts";
import { GlobalOpts, initProject } from "../common.ts";
import { migrateDev } from "../../migrate/dev.ts";
import { migrateStatus } from "../../migrate/status.ts";
import { migrateDeploy } from "../../migrate/deploy.ts";
import { migrateReset } from "../../migrate/reset.ts";

export const dbCommand = new Command<GlobalOpts>();

dbCommand.action(() => dbCommand.showHelp());

dbCommand.command("dev").action(async (opts: GlobalOpts) => {
	await migrateDev(await initProject(opts));
});

dbCommand.command("status").action(async (opts) => {
	await migrateStatus(await initProject(opts));
});

dbCommand.command("reset").action(async (opts) => {
	await migrateReset(await initProject(opts));
});

dbCommand.command("deploy").action(async (opts) => {
	await migrateDeploy(await initProject(opts));
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
