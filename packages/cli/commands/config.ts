import { Command } from "@cliffy/command";
import { GlobalOpts } from "../common.ts";
import { readConfig } from "../../toolchain/config/project.ts";
import { loadProjectConfigPath } from "../../toolchain/project/mod.ts";

export const configCommand = new Command<GlobalOpts>()
	.description("Manage the project config");

configCommand.action(() => configCommand.showHelp());

configCommand.command("show").action(
	async (opts) => {
		const config = await readConfig(loadProjectConfigPath(opts));
		console.log(JSON.stringify(config, null, "\t"));
	},
);
