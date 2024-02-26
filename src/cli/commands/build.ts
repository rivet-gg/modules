import { Command } from "../../deps.ts";
import { GlobalOpts, initProject } from "../common.ts";
import { build } from "../../build/mod.ts";

export const buildCommand = new Command<GlobalOpts>()
	.action(async (opts) => {
		await build(await initProject(opts));
	});
