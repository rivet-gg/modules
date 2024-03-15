import { ModuleConfig, ScriptConfig } from "../config/module.ts";
import { ProjectConfig } from "../config/project.ts";
import { RegistryConfig } from "../config/project.ts";
import { resolve, tjs } from "../deps.ts";
import { Project } from "../project/mod.ts";

export interface ProjectMeta {
	config: ProjectConfig;
	registries: Record<string, RegistryMeta>;
	modules: Record<string, ModuleMeta>;
}

export interface RegistryMeta {
	path: string;
	name: string;
	config: RegistryConfig;
	isExternal: boolean;
}

export interface ModuleMeta {
	path: string;
	name: string;
	config: ModuleConfig;
	registryName: string;
	userConfig: unknown;
	userConfigSchema?: tjs.Definition;
	scripts: Record<string, ScriptMeta>;
	db?: ModuleDatabaseMeta;
	hasUserConfigSchema: boolean;
}

export interface ModuleDatabaseMeta {
	name: string;
}

export interface ScriptMeta {
	path: string;
	name: string;
	config: ScriptConfig;
	requestSchema: tjs.Definition;
	responseSchema: tjs.Definition;
}

/**
 * Generates meta file that can be consumed externally to get information about
 * this project. For example, this is used to auto-generate docs from external
 * tools.
 */
export async function generateMeta(project: Project) {
	const meta: ProjectMeta = {
		config: project.config,
		registries: Object.fromEntries(
			Array.from(project.registries.entries()).map(([name, registry]) => [name, {
				path: registry.path,
				name: name,
				config: registry.config,
				isExternal: registry.isExternal,
			}]),
		),
		modules: Object.fromEntries(
			Array.from(project.modules.entries()).map(([name, mod]) => [name, {
				path: mod.path,
				name: name,
				config: mod.config,
				registryName: mod.registry.name,
				userConfig: mod.userConfig,
				userConfigSchema: mod.userConfigSchema,
				scripts: Object.fromEntries(
					Array.from(mod.scripts.entries()).map(([name, script]) => [name, {
						path: script.path,
						name: name,
						config: script.config,
						requestSchema: script.requestSchema!,
						responseSchema: script.responseSchema!,
					}]),
				),
				db: mod.db,
				hasUserConfigSchema: mod._hasUserConfigSchema!,
			}]),
		),
	};

	await Deno.writeTextFile(
		resolve(project.path, "_gen", "meta.json"),
		JSON.stringify(meta, null, 4),
	);
}
