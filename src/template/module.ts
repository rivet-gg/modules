import * as path from "std/path/mod.ts";
import { Project } from "../project/mod.ts";

export async function templateModule(project: Project, moduleName: string) {
	if (project.modules.has(moduleName)) {
		throw new Error("Module already exists");
	}

	// Create directires
	const modulePath = path.join(project.path, "modules", moduleName);
	await Deno.mkdir(modulePath);
	await Deno.mkdir(path.join(modulePath, "scripts"));
	await Deno.mkdir(path.join(modulePath, "tests"));
	await Deno.mkdir(path.join(modulePath, "db"));
	await Deno.mkdir(path.join(modulePath, "db", "migrations"));
	await Deno.mkdir(path.join(modulePath, "schema"));

	// Write default config
	const moduleYaml = `scripts: {}
errors: {}
`;
	await Deno.writeTextFile(path.join(modulePath, "module.yaml"), moduleYaml);

	// TODO: Write default schema

	// TODO: Add to ogs.yaml
}
