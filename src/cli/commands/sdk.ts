import { Command } from "cliffy/command/mod.ts";
import { GlobalOpts, initProject } from "../common.ts";
import * as path from "std/path/mod.ts";
import { build } from "../../build/mod.ts";
import { generate } from "../../sdk/generate.ts";
"";

export const sdkCommand = new Command<GlobalOpts>();

sdkCommand.action(() => sdkCommand.showHelp());

sdkCommand.command("generate").action(async () => {
	await generate();
});
