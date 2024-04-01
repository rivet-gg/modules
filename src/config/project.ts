import { parse, resolve } from "../deps.ts";
import { Ajv } from "./deps.ts";
import schema from "../../artifacts/project_schema.json" with { type: "json" };
import { InternalError } from "../error/mod.ts";
import { load as loadEnv } from "https://deno.land/std@0.208.0/dotenv/mod.ts";
import { verbose, warn } from "../term/status.ts";

export interface ProjectConfig extends Record<string, unknown> {
	registries: { [name: string]: RegistryConfig };
	modules: { [name: string]: ProjectModuleConfig };
}

export type RegistryConfig = { local: RegistryConfigLocal } | { git: RegistryConfigGit };

export interface RegistryConfigLocal {
	directory: string;

	/**
	 * If true, this will be treated like an external registry. This is
	 * important if multiple projects are using the same registry locally.
	 *
	 *  Modules from this directory will not be tested, formatted, linted, and
	 *  generate Prisma migrations.
	 */
	isExternal?: boolean;
}

export type RegistryConfigGit =
	& { url: RegistryConfigGitUrl; directory?: string }
	& ({ branch: string } | { tag: string } | { rev: string });

/**
 * The URL to the git repository.
 *
 * If both HTTPS and SSH URL are provided, they will both be tried and use the
 * one that works.
 */
export type RegistryConfigGitUrl = string | { https?: string; ssh?: string };

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
	 * The config that configures how this module is ran at runtime.
	 */
	config?: any;
}

// export async function readConfig(path: string): Promise<ProjectConfig> {
// 	const configRaw = await Deno.readTextFile(path);
// 	return parse(configRaw) as ProjectConfig;
// }

const projectConfigAjv = new Ajv.default({
	schemas: [schema],
});

export async function readConfig(projectPath: string): Promise<ProjectConfig> {
	// Load `.env` file
	const envPath = dotenvPath(projectPath);
	try {
		verbose(`Loading .env file`, envPath);
		await loadEnv({ envPath, export: true });
	} catch (e) {
		warn("Failed to load .env file", e);
	}

	// Read config
	const configRaw = await Deno.readTextFile(
		configPath(projectPath),
	);
	const rawConfig = parse(configRaw);
	const config = interpolateEnvVars(rawConfig);

	// Validate config
	const projectConfigSchema = projectConfigAjv.getSchema("#");
	if (!projectConfigSchema) {
		throw new InternalError("Failed to get project config schema");
	}
	if (!projectConfigSchema(config)) {
		throw new InternalError(
			`Invalid project config: ${JSON.stringify(projectConfigSchema.errors)}`,
		);
	}

	return config as ProjectConfig;
}

function interpolateEnvVars(config: unknown): unknown {
	function isObject(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null;
	}

	function replaceEnvObjects(value: unknown): unknown {
		if (!isObject(value)) {
			if (Array.isArray(value)) {
				// Recursively replace env objects in arrays
				return value.map(replaceEnvObjects);
			} else {
				// Value is a scalar, return it as is.
				return value;
			}
		}

		// If value is of type `{ env: "ENV_VAR_NAME" }`
		if (Object.keys(value).length === 1 && "env" in value) {
			// Get the environment variable name
			const envVarName = value["env"];
			if (typeof envVarName !== "string") {
				throw new Error("env field must be a string");
			}

			// Get the environment variable value
			const envVar = Deno.env.get(envVarName);
			if (envVar === undefined) {
				throw new Error(`Environment variable ${value["env"]} is not set`);
			}

			// Return the environment variable value as the canonicalized value of the
			// { env: "ENV_VAR_NAME" } object
			return envVar;
		} else {
			// Recursively replace env objects in objects
			const newValue: Record<string, unknown> = {};
			for (const key in value) {
				newValue[key] = replaceEnvObjects(value[key]);
			}

			// Return the recursively interpolated object
			return newValue;
		}
	}

	if (!isObject(config)) return config;

	const modules = config["modules"];
	if (!isObject(modules)) return config;

	const newModules: Record<string, unknown> = {};
	for (const moduleName in modules) {
		// Get the module
		const module = modules[moduleName];
		if (!isObject(module)) {
			newModules[moduleName] = module;
			continue;
		}

		// Get the `config` field of each module
		const moduleConfig = module["config"];

		// Replace the old config with the new one
		const newModule = {
			...module,
			config: replaceEnvObjects(moduleConfig),
		};
		newModules[moduleName] = newModule;
	}

	// Replace the old modules with the ones with new configs
	return {
		...config,
		modules: newModules,
	};
}

export function configPath(root: string): string {
	return resolve(root, "backend.yaml");
}

export function dotenvPath(root: string): string {
	return resolve(root, ".env");
}
