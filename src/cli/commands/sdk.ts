import { Command } from "../../deps.ts";
import { GlobalOpts, initProject } from "../common.ts";
import { generate } from "../../sdk/generate.ts";
"";

export const sdkCommand = new Command<GlobalOpts>();

sdkCommand.action(() => sdkCommand.showHelp());

sdkCommand.command("generate").action(async () => {
	await generate();
});
