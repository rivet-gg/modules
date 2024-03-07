import { Command } from "../deps.ts";
import { GlobalOpts } from "../common.ts";
import { generate } from "../../sdk/generate.ts";
"";

export const sdkCommand = new Command<GlobalOpts>()
	.description("SDK commands");

sdkCommand.action(() => sdkCommand.showHelp());

sdkCommand.command("generate").action(async (opts) => {
	await generate(opts.path);
});
