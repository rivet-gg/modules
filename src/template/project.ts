import { resolve, stringify } from "../deps.ts";
import { ProjectConfig } from "../config/project.ts";

export async function templateProject(rootPath: string) {
	// Create project directory
	const createdFiles : string[] = [];

	await Deno.mkdir(rootPath, { recursive: true });

	// Create backend.yaml
	const defaultBackend: ProjectConfig = {
		registries: {
			local: {
				local: {
					directory: "modules",
				},
			},
		},
		modules: {
			users: {},
			rate_limit: {},
			tokens: {},
		},
	};
	await Deno.writeTextFile(
		resolve(rootPath, "backend.yaml"),
		stringify(defaultBackend),
	);

	// Add to created files
	createdFiles.push(stringify(defaultBackend))

	// Create modules directory
	await Deno.mkdir(resolve(rootPath, "modules"), { recursive: true });

	// Create modules/users directory
	const modulePath = resolve(rootPath, "modules");
	createdFiles.push(modulePath);
	return createdFiles;
}
