import { Command } from "../deps.ts";
import { GlobalOpts, initProject } from "../common.ts";
import { listSourceFiles } from "../../project/mod.ts";

export const formatCommand = new Command<GlobalOpts>()
	.option("--check, -c", "Check if files are formatted")
	.action(
		async (opts) => {
			const project = await initProject(opts);

			const sourceFiles = await listSourceFiles(project, { localOnly: true });

			const cmd = await new Deno.Command("deno", {
				args: [
					"fmt",
					...opts.check ? ["--check"] : [],
					...sourceFiles,
				],
				stdout: "inherit",
				stderr: "inherit",
			})
				.output();
			if (!cmd.success) throw new Error("Check failed");
		},
	);
