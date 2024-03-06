import { Command } from "../deps.ts";
import { GlobalOpts } from "../common.ts";
import { templateProject } from "../../template/project.ts";

export const initCommand = new Command<GlobalOpts>()
    .description("Create a new project")
	.arguments("[dir]")
	.action(
		async (_opts, dir?: string) => {
			await templateProject(dir || ".");
		},
	);
