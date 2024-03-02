import { parse, join, Ajv } from "../deps.ts";
import schema from "../../artifacts/project_schema.json" with { type: "json" };

export interface ProjectConfig extends Record<string, unknown> {
	registries: { [name: string]: RegistryConfig };
	modules: { [name: string]: ProjectModuleConfig };
}

export interface RegistryConfig extends Record<string, unknown> {
	directory?: string;
	// git?: string;
	// branch?: string;
	// rev?: string;
}

// export interface RegistryConfig extends Record<string, unknown> {
// 	name: string;
// 	url: string;
// }

export interface ProjectModuleConfig extends Record<string, unknown> {
	/**
	 * The name of the registry to fetch the module from.
	 */
	registry?: string;

	/**
	 * Overrides the name of the module to fetch inside the registry.
	 */
	module?: string;

	/**
	 * The config to pass to the registry.
	 */
	// config?: any;
}

// export async function readConfig(path: string): Promise<ProjectConfig> {
// 	const configRaw = await Deno.readTextFile(path);
// 	return parse(configRaw) as ProjectConfig;
// }

const projectConfigAjv = new Ajv.default({
	schemas: [schema],
});

export async function readConfig(projectPath: string): Promise<ProjectConfig> {
	// Read config
	const configRaw = await Deno.readTextFile(
		join(projectPath, "ogs.yaml"),
	);
	const config = parse(configRaw) as ProjectConfig;

	// Validate config
	const projectConfigSchema = projectConfigAjv.getSchema(
		"#/definitions/ProjectConfig",
	);
	if (!projectConfigSchema) {
		throw new Error("Failed to get project config schema");
	}
	if (!projectConfigSchema(config)) {
		throw new Error(
			`Invalid project config: ${JSON.stringify(projectConfigSchema.errors)}`,
		);
	}

	return config;
}
