import { ModuleConfig } from "../config/module.ts";
import { resolve, stringify } from "../deps.ts";
import { Project } from "../project/mod.ts";
import { dedent } from "./deps.ts";

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

	// Write default config
	const defaultModule: ModuleConfig = {
		scripts: {},
		errors: {},
	};
	await Deno.writeTextFile(
		resolve(modulePath, "module.yaml"),
		stringify(defaultModule),
	);

	// Write default migration
	const defaultSchema = dedent`
		datasource db {
			provider = "postgresql"
			url      = env("DATABASE_URL")
		}
	`;
	await Deno.writeTextFile(
		resolve(modulePath, "db", "schema.prisma"),
		defaultSchema,
	);

	// Add to backend.yaml
	const newConfig = structuredClone(project.config);
	newConfig.modules[moduleName] = {
		registry: "local",
	};
	await Deno.writeTextFile(
		resolve(project.path, "backend.yaml"),
		stringify(newConfig),
	);
}
