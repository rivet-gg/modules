import { join } from "../deps.ts";
import { Project } from "../project/mod.ts";

export async function templateModule(project: Project, moduleName: string) {
	if (project.modules.has(moduleName)) {
		throw new Error("Module already exists");
	}

	// Create directires
	const modulePath = join(project.path, "modules", moduleName);
	await Deno.mkdir(modulePath);
	await Deno.mkdir(join(modulePath, "scripts"));
	await Deno.mkdir(join(modulePath, "tests"));
	await Deno.mkdir(join(modulePath, "db"));
	await Deno.mkdir(join(modulePath, "db", "migrations"));
	await Deno.mkdir(join(modulePath, "schema"));

	// Write default config
	const moduleYaml = `scripts: {}
errors: {}
`;
	await Deno.writeTextFile(join(modulePath, "module.yaml"), moduleYaml);

	// TODO: Write default schema

	// TODO: Add to opengb.yaml
}
