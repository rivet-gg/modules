import { join } from "../../deps.ts";
import { Command } from "../deps.ts";
import { GlobalOpts, initProject } from "../common.ts";
import { build, DbDriver, Format, Runtime } from "../../build/mod.ts";
import { ensurePostgresRunning } from "../../utils/postgres_daemon.ts";

export const devCommand = new Command<GlobalOpts>();

devCommand.action(() => devCommand.showHelp());

// TODO: https://github.com/rivet-gg/open-game-services-engine/issues/84
// devCommand.command("setup").action(async () => {
// 	const cmd = await new Deno.Command("docker-compose", {
// 		args: ["up", "-d"],
// 		stdout: "inherit",
// 		stderr: "inherit",
// 	})
// 		.output();
// 	if (!cmd.success) throw new Error("Failed to setup Docker Compose");
// });

// devCommand.command("teardown").action(async () => {
// 	const cmd = await new Deno.Command("docker-compose", {
// 		args: ["down", "-d"],
// 		stdout: "inherit",
// 		stderr: "inherit",
// 	})
// 		.output();
// 	if (!cmd.success) throw new Error("Failed to teardown Docker Compose");
// });

devCommand
	.command("start")
	.option("--no-format", "Don't format modules")
	.option("--no-build", "Don't build source files")
	.option("--no-migrate", "Don't migrate database")
	// .option("--no-lint", "Don't lint the codebase")
	.option("--no-check", "Don't check source files before running")
	.option("--no-watch", "Don't automatically restart server on changes")
	.action(
		async (opts) => {
			const project = await initProject(opts);

			await ensurePostgresRunning(project);

			const entrypointPath = join(project.path, "_gen", "entrypoint.ts");

			// TODO: Only format local modules
			// Fmt project
			if (opts.format) {
				const cmd = await new Deno.Command("deno", {
					args: [
						"fmt",
						project.path,
					],
					stdout: "inherit",
					stderr: "inherit",
				})
					.output();
				if (!cmd.success) throw new Error("Format failed");
			}

			// Build project
			if (opts.build) {
				await build(project, {
					runtime: Runtime.Deno,
					format: Format.Native,
					dbDriver: DbDriver.NodePostgres,
				});
			}

			// Migrate project
			if (opts.migrate) {
				// TODO
			}

			// TODO: Only lint local modules
			// Lint project
			// if (opts.lint) {
			// 	const cmd = await new Deno.Command("deno", {
			// 		args: [
			// 			"lint",
			// 			project.path,
			// 		],
			// 		stdout: "inherit",
			// 		stderr: "inherit",
			// 	})
			// 		.output();
			// 	if (!cmd.success) throw new Error("Format failed");
			// }

			// Determine args
			const args = [
				"--allow-env",
				"--allow-net",
				"--allow-read",
			];
			if (opts.check) args.push("--check");
			if (opts.watch) args.push("--watch");

			// Run entrypoint
			const cmd = await new Deno.Command("deno", {
				args: [
					"run",
					...args,
					entrypointPath,
				],
				stdout: "inherit",
				stderr: "inherit",
			})
				.output();
			if (!cmd.success) throw new Error("Entrypoint failed");
		},
	);
