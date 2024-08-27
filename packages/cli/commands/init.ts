import { Command } from "@cliffy/command";
import { GlobalOpts } from "../common.ts";
import { templateProject } from "../../toolchain/template/project.ts";

export const initCommand = new Command<GlobalOpts>()
	.description("Create a new project")
	.arguments("[dir]")
	.action(
		async (_opts, dir?: string) => {
			await templateProject(dir || ".");

			console.log("Welcome to Open Game Backend");
			console.log("");
			console.log("Created backend.json & modules");
			console.log("");
			console.log("Get started at https://opengb.dev/concepts/quickstart");
		},
	);
