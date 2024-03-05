import { exists, join } from "../deps.ts";
import { readConfig as readProjectConfig } from "../config/project.ts";
import { ProjectConfig } from "../config/project.ts";
import { loadModule, Module } from "./module.ts";
import { RegistryConfig } from "../config/project.ts";
import { ProjectModuleConfig } from "../config/project.ts";
import { bold, brightRed } from "https://deno.land/std@0.208.0/fmt/colors.ts";

export interface Project {
	path: string;
	projectConfig: ProjectConfig;
	modules: Map<string, Module>;
}

export interface LoadProjectOpts {
	path?: string;
}

export async function loadProject(opts: LoadProjectOpts): Promise<Project> {
	const projectRoot = join(Deno.cwd(), opts.path ?? ".");

	// console.log("Loading project", projectRoot);

	// Read project config
	const projectConfig = await readProjectConfig(
		projectRoot,
	);

	// Load modules
	const modules = new Map<string, Module>();
	for (const projectModuleName in projectConfig.modules) {
		const modulePath = await fetchAndResolveModule(
			projectRoot,
			projectConfig,
			projectModuleName,
		);
		const module = await loadModule(modulePath, projectModuleName);
		modules.set(projectModuleName, module);
	}


	// Verify existince of module dependencies
	const missingDepsByModule = new Map<string, string[]>();
	for (const module of modules.values()) {
		const missingDeps = [] as string[];
		for (const dependencyName in module.config.dependencies) {
			const dependencyModule = modules.get(dependencyName);
			if (!dependencyModule) {
				missingDeps.push(dependencyName);
			}
		}

		if (missingDeps.length > 0) {
			missingDepsByModule.set(module.name, missingDeps);
		}
	}

	if (missingDepsByModule.size > 0) {
		let message = bold(brightRed("Unresolved module dependencies:\n"));
		for (const [moduleName, missingDeps] of missingDepsByModule) {
			message += `\tModule ${moduleName} is missing dependencies: ${missingDeps.join(", ")}\n`;
		}
		throw new Error(message);
	}

	// Module can't depend on itself
	const selfDepModules = [] as string[];
	for (const module of modules.values()) {
		if (module.config.dependencies?.[module.name]) {
			selfDepModules.push(module.name);
		}
	}

	if (selfDepModules.length > 0) {
		let message = bold(brightRed("Modules can't depend on themselves:\n"));
		for (const moduleName of selfDepModules) {
			message += `\tModule ${moduleName} can't depend on itself\n`;
		}
		throw new Error(message);
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
	const registryPath = join(projectRoot, registry.directory);
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
	const modulePath = join(registryPath, pathModuleName);
	if (await exists(join(modulePath, "module.yaml"))) {
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

export function genRuntimePath(project: Project): string {
	return join(project.path, "_gen", "runtime");
}

export function genRuntimeModPath(project: Project): string {
	return join(project.path, "_gen", "runtime", "src", "runtime", "mod.ts");
}
