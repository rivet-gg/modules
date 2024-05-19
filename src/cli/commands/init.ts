import { Command } from "../deps.ts";
import { GlobalOpts } from "../common.ts";
import { templateProject } from "../../template/project.ts";

export const initCommand = new Command<GlobalOpts>()
	.description("Create a new project")
	.arguments("[dir]")
	.action(
		async (_opts, dir?: string) => {
			// Create a new project in the specified directory
			const createdFiles = await templateProject(dir || ".");
			
			// If the project creation failed, log an error message
			if (createdFiles === undefined) {
				console.log("Project creation failed. Please try again.");
				return;
			}
			
			// Log the files that were created
			console.log("Project created successfully!");
			console.log("Created config file at backend.yaml");
			console.log("Get started at https://opengb.dev/introduction");
		},
	);
