import { Command } from "../deps.ts";
import { GlobalOpts, initProject } from "../common.ts";
import { templateScript } from "../../template/script.ts";
import { templateModule } from "../../template/module.ts";

import { validateIdentifier } from "../../types/identifiers/mod.ts";
import { IdentType } from "../../types/identifiers/defs.ts";

const handleNames = (name: string, type: string) => {
	const moduleNameError = validateIdentifier(
		name,
		IdentType.ModuleScripts,
	);
	if (moduleNameError) {
		console.error(moduleNameError.toString(type));
		Deno.exit(1);
	}
};

export const createCommand = new Command<GlobalOpts>();

createCommand.action(() => createCommand.showHelp());

createCommand.command("module").arguments("<module>").action(
	async (opts, module) => {
		handleNames(module, "module");

		await templateModule(await initProject(opts), module);
	},
);

createCommand.command("script").arguments("<module> <script>").action(
	async (opts, module, script) => {
		handleNames(module, "module");
		handleNames(script, "script");

		await templateScript(await initProject(opts), module, script);
	},
);
