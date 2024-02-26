import { Command } from "../deps.ts";
import { GlobalOpts, initProject } from "../common.ts";
import { templateScript } from "../../template/script.ts";
import { templateModule } from "../../template/module.ts";

export const createCommand = new Command<GlobalOpts>();

createCommand.action(() => createCommand.showHelp());

createCommand.command("module").arguments("<module>").action(
	async (opts, module) => {
		await templateModule(await initProject(opts), module);
	},
);

createCommand.command("script").arguments("<module> <script>").action(
	async (opts, module, script) => {
		await templateScript(await initProject(opts), module, script);
	},
);
