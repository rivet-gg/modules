import { Command } from "@cliffy/command";
import { GlobalOpts } from "../common.ts";
import { build, DbDriver, Format, Runtime } from "../../toolchain/build/mod.ts";
import { watch } from "../../toolchain/watch/mod.ts";
import { Project } from "../../toolchain/project/mod.ts";
import { InternalError } from "../../toolchain/error/mod.ts";
import { ENTRYPOINT_PATH, projectGenPath } from "../../toolchain/project/project.ts";
import { convertMigrateMode, migrateMode } from "./../util.ts";
import { ensurePostgresRunning, getDefaultDatabaseUrl } from "../../toolchain/postgres/mod.ts";

export const devCommand = new Command<GlobalOpts>()
	.description("Start the development server")
	.type("migrate-mode", migrateMode)
	.option("--no-build", "Don't build source files")
	.option("--no-check", "Don't check source files before running")
	.option("--strict-schemas", "Strictly validate schemas", { default: true })
	.option("--no-watch", "Automatically restart server on changes")
	.option("--no-migrate", "Disable migrations")
	.option(
		"--migrate-mode <mode:migrate-mode>",
		"Configure how migrations are ran",
		{ default: "dev" },
	)
	// Reserved for future use
	.option("--non-interactive", "Run without interactive input")
	.action(
		async (opts) => {
			await watch({
				loadProjectOpts: opts,
				disableWatch: !opts.watch,
				async fn(project: Project, signal: AbortSignal) {
					await ensurePostgresRunning(project);

					// Build project
					if (opts.build) {
						await build(project, {
							runtime: Runtime.Deno,
							format: Format.Native,
							dbDriver: DbDriver.NodePostgres,
							strictSchemas: opts.strictSchemas,
							// This gets ran on `deno run`
							skipDenoCheck: true,
							migrate: opts.migrate
								? {
									mode: convertMigrateMode(opts.migrateMode),
								}
								: undefined,
							signal,
						});
					}

					// Determine args
					const args = [
						"--allow-env",
						"--allow-net",
						"--allow-read",
					];
					if (opts.check) args.push("--check");

					// Run entrypoint
					const entrypointPath = projectGenPath(project, ENTRYPOINT_PATH);
					const cmd = await new Deno.Command("deno", {
						args: [
							"run",
							...args,
							entrypointPath,
						],
						stdout: "inherit",
						stderr: "inherit",
						signal,
            env: {
              "DATABASE_URL": await getDefaultDatabaseUrl(project),
            }
					})
						.output();
					if (!cmd.success) throw new InternalError("Entrypoint failed", { path: entrypointPath });
				},
			});
		},
	);
