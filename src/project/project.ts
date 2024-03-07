import { dirname, exists, join, copy } from "../deps.ts";
import { glob, bold, brightRed } from "./deps.ts";
import { readConfig as readProjectConfig } from "../config/project.ts";
import { ProjectConfig } from "../config/project.ts";
import { loadModule, Module } from "./module.ts";
import { loadRegistry, Registry } from "./registry.ts";
import { ProjectModuleConfig } from "../config/project.ts";
import { validateIdentifier } from "../types/identifiers/mod.ts";
import { IdentType } from "../types/identifiers/defs.ts";

export interface Project {
	path: string;
	config: ProjectConfig;
	registries: Map<string, Registry>;
	modules: Map<string, Module>;
}

export interface LoadProjectOpts {
	path?: string;
}

export async function loadProject(opts: LoadProjectOpts): Promise<Project> {
	const projectRoot = join(Deno.cwd(), opts.path ?? ".");

	// Read project config
	const projectConfig = await readProjectConfig(
		projectRoot,
	);

	// Load registries
	const registries = new Map();
	for (const registryName in projectConfig.registries) {
		const registryConfig = projectConfig.registries[registryName];
		const registry = await loadRegistry(
			projectRoot,
			registryName,
			registryConfig,
		);
		registries.set(registryName, registry);
	}

	// Load modules
	const modules = new Map<string, Module>();
	for (const projectModuleName in projectConfig.modules) {
		const { path, registry } = await fetchAndResolveModule(
			projectRoot,
			projectConfig,
			registries,
			projectModuleName,
		);
		const module = await loadModule(path, projectModuleName, registry);
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



	return { path: projectRoot, config: projectConfig, registries, modules };
}

/**
 * Clones a registry to a local machine and resovles the path to the module.
 */
async function fetchAndResolveModule(
	projectRoot: string,
	projectConfig: ProjectConfig,
	registries: Map<string, Registry>,
	moduleName: string,
): Promise<{ path: string; registry: Registry }> {
	const moduleNameIssue = validateIdentifier(moduleName, IdentType.ModuleScripts);
	if (moduleNameIssue) {
		throw new Error(moduleNameIssue.toString("module"));
	}

	// Lookup module
	const module = projectConfig.modules[moduleName];
	if (!module) throw new Error(`Module not found ${moduleName}`);

	// Lookup registry
	const registryName = registryNameForModule(module);
	const registry = registries.get(registryName);
	if (!registry) {
		throw new Error(`Registry ${registryName} not found for module ${module}`);
	}

	// Resolve module path
	const pathModuleName = moduleNameInRegistry(moduleName, module);
	const modulePath = join(registry.path, pathModuleName);
	if (!await exists(join(modulePath, "module.yaml"))) {
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

	// Copy to gen dir
	//
	// We do this so generate files into the gen dir without modifying the
	// original module. For example. if multiple projects are using the same
	// local registry, we don't want conflicting generated files.
	const dstPath = join(
		projectRoot,
		"_gen",
		"modules",
		registryName,
		moduleName,
	);
	await Deno.mkdir(dirname(dstPath), { recursive: true });
	await copy(modulePath, dstPath, { overwrite: true });

	return { path: dstPath, registry };
}

function registryNameForModule(module: ProjectModuleConfig): string {
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

export interface ListSourceFileOpts {
	/**
	 * Only include local files.
	 *
	 * Useful for commands that are only relevant to modules written by the user.
	 */
	localOnly?: boolean;
}

/**
 * List all paths to TypeScript files in the project.
 */
export async function listSourceFiles(
	project: Project,
	opts: ListSourceFileOpts = {},
): Promise<string[]> {
	const files: string[] = [];
	for (const module of project.modules.values()) {
		// Skip non-local files
		if (opts.localOnly && !("local" in module.registry.config)) continue;

		const moduleFiles =
			(await glob.glob("**/*.ts", { cwd: module.path, ignore: "_gen/**" }))
				.map((x) => join(module.path, x));
		files.push(...moduleFiles);
	}
	return files;
}
