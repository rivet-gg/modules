import { assert, copy, emptyDir, exists, resolve } from "../deps.ts";
import { bold, brightRed, glob } from "./deps.ts";
import { readConfig as readProjectConfig } from "../config/project.ts";
import { ProjectConfig } from "../config/project.ts";
import { loadModule, Module } from "./module.ts";
import { loadRegistry, Registry } from "./registry.ts";
import { ProjectModuleConfig } from "../config/project.ts";
import { validateIdentifier } from "../types/identifiers/mod.ts";
import { IdentType } from "../types/identifiers/defs.ts";
import { loadDefaultRegistry } from "./registry.ts";

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
	const projectRoot = resolve(Deno.cwd(), opts.path ?? ".");

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

	if (!registries.has("default")) {
		const defaultRegistry = await loadDefaultRegistry(projectRoot);
		registries.set("default", defaultRegistry);
	}

	// Validate local registry
	const localRegistry = registries.get("local");
	if (localRegistry) {
		if (!("local" in localRegistry.config)) throw new Error("Local registry must be configured with local");
		if (localRegistry.isExternal) throw new Error("Local registry can't be external");
	}

	// Load modules
	const modules = new Map<string, Module>();
	for (const projectModuleName in projectConfig.modules) {
		const projectModuleConfig = projectConfig.modules[projectModuleName];

		const { path, registry } = await fetchAndResolveModule(
			projectRoot,
			projectConfig,
			registries,
			projectModuleName,
		);
		const module = await loadModule(path, projectModuleName, projectModuleConfig, registry);
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
			message += `\tCannot resolve dependencies for ${moduleName}: ${missingDeps.join(", ")}\n`;
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

interface FetchAndResolveModuleOutput {
	/**
	 * Path the module was copied to in _gen.
	 */
	path: string;

	/**
	 * Path to the original module source code.
	 */
	sourcePath: string;

	/**
	 * Registry the module was fetched from.
	 */
	registry: Registry;
}

/**
 * Clones a registry to a local machine and resovles the path to the module.
 */
async function fetchAndResolveModule(
	projectRoot: string,
	projectConfig: ProjectConfig,
	registries: Map<string, Registry>,
	moduleName: string,
): Promise<FetchAndResolveModuleOutput> {
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
	const sourcePath = resolve(registry.path, pathModuleName);
	if (!await exists(resolve(sourcePath, "module.yaml"))) {
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

	let path: string;
	if (registry.isExternal) {
		// Copy to gen dir
		//
		// We do this so generate files into the gen dir without modifying the
		// original module. For example. if multiple projects are using the same
		// local registry, we don't want conflicting generated files.
		path = resolve(
			projectRoot,
			"_gen",
			"external_modules",
			moduleName,
		);

		// HACK: Copy _gen dir to temp dir to avoid overwriting it
		const genPath = resolve(path, "_gen");
		let tempGenDir: string | undefined;
		if (await exists(genPath, { isDirectory: true })) {
			tempGenDir = await Deno.makeTempDir();
			await copy(genPath, tempGenDir, { overwrite: true });
		}

		// TODO: Only copy when needed, this copies every time the CLI is ran
		await emptyDir(path);
		await copy(sourcePath, path, { overwrite: true });

		// HACK: Restore _gen dir
		if (tempGenDir) {
			await emptyDir(genPath);
			await copy(tempGenDir, genPath, { overwrite: true });
		}
	} else {
		// Use original path
		path = sourcePath;
	}

	return { path, sourcePath: sourcePath, registry };
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
	return resolve(project.path, "_gen", "runtime");
}

export function genRuntimeModPath(project: Project): string {
	return resolve(project.path, "_gen", "runtime", "src", "runtime", "mod.ts");
}

export function genRegistryMapPath(project: Project): string {
	return resolve(project.path, "_gen", "registryMap.ts");
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
		if (opts.localOnly && module.registry.isExternal) continue;

		const moduleFiles = (await glob.glob("**/*.ts", { cwd: module.path, ignore: "_gen/**" }))
			.map((x) => resolve(module.path, x));
		files.push(...moduleFiles);
	}
	return files;
}

export async function cleanProject(project: Project) {
	// Remove project dir
	await Deno.remove(resolve(project.path, "_gen"), { recursive: true });

	// Remove module gen dir
	for (const module of project.modules.values()) {
		if (module.registry.isExternal) continue;

		const genPath = resolve(module.path, "_gen");
		if (await exists(genPath, { isDirectory: true })) {
			await Deno.remove(genPath, { recursive: true });
		}
	}
}

export function getDefaultRegistry(project: Project): Registry | undefined {
	return project.registries.get("default");
}

export function getLocalRegistry(
	project: Project,
): Registry | undefined {
	const localRegistry = project.registries.get("local");
	if (localRegistry) {
		assert("local" in localRegistry.config);
		assert(!localRegistry.isExternal);
		return localRegistry;
	} else {
		return undefined;
	}
}
