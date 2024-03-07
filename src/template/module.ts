import { resolve } from "../deps.ts";
import { Project } from "../project/mod.ts";

export async function templateModule(project: Project, moduleName: string) {
	if (project.modules.has(moduleName)) {
		throw new Error("Module already exists");
	}

	// Create directires
	const modulePath = resolve(project.path, "modules", moduleName);
	await Deno.mkdir(modulePath);
	await Deno.mkdir(resolve(modulePath, "scripts"));
	await Deno.mkdir(resolve(modulePath, "tests"));
	await Deno.mkdir(resolve(modulePath, "db"));
	await Deno.mkdir(resolve(modulePath, "db", "migrations"));
	await Deno.mkdir(resolve(modulePath, "schema"));

	// Write default config
	const moduleYaml = `scripts: {}
errors: {}
`;
	await Deno.writeTextFile(resolve(modulePath, "module.yaml"), moduleYaml);

	// TODO: Write default schema

	// TODO: Add to backend.yaml
}
