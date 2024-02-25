import * as path from "std/path/mod.ts";
import { readConfig as readProjectConfig } from "../config/project.ts";
import { ProjectConfig } from "../config/project.ts";
import { loadModule, Module } from "./module.ts";
import { exists } from "std/fs/exists.ts";
import { RegistryConfig } from "../config/project.ts";
import { ProjectModuleConfig } from "../config/project.ts";

export interface Registry {
	path: string;
	projectConfig: ProjectConfig;
	modules: Map<string, Module>;
}

export async function loadRegistry(): Promise<Registry> {
	// Derive root path
	const ogsPathEnv = Deno.env.get("OGS_PATH");
	if (!ogsPathEnv) throw new Error("OGS_PATH environment variable not set");
	const projectRoot = path.join(Deno.cwd(), ogsPathEnv);

	console.log("Loading registry", projectRoot);

	// Read project config
	const projectConfig = await readProjectConfig(
		projectRoot,
	);

	// Load modules
	const modules = new Map();
	for (const projectModuleName in projectConfig.modules) {
		const modulePath = await fetchAndResolveModule(
			projectRoot,
			projectConfig,
			projectModuleName,
		);
		const module = await loadModule(modulePath, projectModuleName);
		modules.set(projectModuleName, module);
	}

	return { path: projectRoot, projectConfig, modules };
}

/**
 * Clones a registry to the local machine if required and returns the path.
 */
async function fetchAndResolveRegistry(
	projectRoot: string,
	registry: RegistryConfig,
): Promise<string> {
	// TODO: Impl git cloning
	if (!registry.directory) throw new Error("Registry directory not set");
	const registryPath = path.join(projectRoot, registry.directory);
	if (!await exists(registryPath)) {
		throw new Error(`Registry not found at ${registryPath}`);
	}
	return registryPath;
}

/**
 * Clones a registry to a local machine and resovles the path to the module.
 */
async function fetchAndResolveModule(
	projectRoot: string,
	projectConfig: ProjectConfig,
	moduleName: string,
): Promise<string> {
	// Lookup module
	const module = projectConfig.modules[moduleName];
	if (!module) throw new Error(`Module not found ${moduleName}`);

	// Lookup registry
	const registryName = registryForModule(module);
	const registryConfig = projectConfig.registries[registryName];
	if (!registryConfig) {
		throw new Error(`Registry ${registryName} not found for module ${module}`);
	}
	const registryPath = await fetchAndResolveRegistry(
		projectRoot,
		registryConfig,
	);

	// Resolve module path
	const pathModuleName = moduleNameInRegistry(moduleName, module);
	const modulePath = path.join(registryPath, pathModuleName);
	if (await exists(path.join(modulePath, "module.yaml"))) {
		return modulePath;
	} else {
		if (pathModuleName != moduleName) {
			// Has alias
			throw new Error(
				`Module ${pathModuleName} (alias of ${moduleName}) not found in registry ${registryName}`,
			);
		} else {
			// No alias
			throw new Error(
				`Module ${pathModuleName} not found in registry ${registryName}`,
			);
		}
	}
}

function registryForModule(module: ProjectModuleConfig): string {
	return module.registry ?? "default";
}

function moduleNameInRegistry(
	moduleName: string,
	module: ProjectModuleConfig,
): string {
	return module.module ?? moduleName;
}
