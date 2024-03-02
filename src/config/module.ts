import { Ajv, join, parse } from "../deps.ts";
import schema from "./module_schema.json" with { type: "json" };

export interface ModuleConfig extends Record<string, unknown> {
	status?: "preview" | "beta" | "stable" | "deprecated";
	description?: string;

	/**
	 * The GitHub handle of the authors of the module.
	 */
	authors?: string[];

	scripts: { [name: string]: ScriptConfig };
	errors: { [name: string]: ErrorConfig };
}

export interface ScriptConfig {
	/**
	 * If the script can be called from the public HTTP interface.
	 *
	 * If enabled, ensure that authentication & rate limits are configued for
	 * this endpoints. See the `user` and `rate_limit` modules.
	 *
	 * @default false
	 */
	public?: boolean;
}

export interface ErrorConfig {
	description?: string;
}

const moduleConfigAjv = new Ajv.default({
	schemas: [schema],
});

export async function readConfig(modulePath: string): Promise<ModuleConfig> {
	// Read config
	const configRaw = await Deno.readTextFile(
		join(modulePath, "module.yaml"),
	);
	const config = parse(configRaw) as ModuleConfig;

	// Validate config
	const moduleConfigSchema = moduleConfigAjv.getSchema(
		"#/definitions/ModuleConfig",
	);
	if (!moduleConfigSchema) {
		throw new Error("Failed to get module config schema");
	}
	if (!moduleConfigSchema(config)) {
		throw new Error(
			`Invalid module config: ${JSON.stringify(moduleConfigSchema.errors)}`,
		);
	}

	return config;
}
