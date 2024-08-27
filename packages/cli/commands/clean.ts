import { Command } from "@cliffy/command";
import { GlobalOpts, initProject } from "../common.ts";
import { cleanProject } from "../../toolchain/project/project.ts";

export const cleanCommand = new Command<GlobalOpts>()
	.description("Removes all build artifacts")
	.action(
		async (opts) => {
			const project = await initProject(opts);
			await cleanProject(project);
		},
	);
