import { copy, emptyDir, exists, resolve } from "../deps.ts";
import { bold, brightRed, glob } from "./deps.ts";
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
		const defaultRegistry = await loadRegistry(
			projectRoot,
			"default",
			{
				git: {
					url: {
						https: "https://github.com/rivet-gg/open-game-services.git",
						ssh: "git@github.com:rivet-gg/opengb-registry.git",
					},
					// TODO: https://github.com/rivet-gg/opengb/issues/151
					rev: "f28b9c0ddbb69fcc092dfff12a18707065a69251",
					directory: "./modules",
				},
			},
		);
		registries.set("default", defaultRegistry);
	}

	// Load modules
	const modules = new Map<string, Module>();
	for (const projectModuleName in projectConfig.modules) {
		const { genPath, sourcePath, registry } = await fetchAndResolveModule(
			projectRoot,
			projectConfig,
			registries,
			projectModuleName,
		);
		const module = await loadModule(genPath, sourcePath, projectModuleName, registry);
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
			message += `\tModule ${moduleName} is missing dependencies: ${
				missingDeps.join(", ")
			}\n`;
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
	genPath: string;

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
	const modulePath = resolve(registry.path, pathModuleName);
	if (!await exists(resolve(modulePath, "module.yaml"))) {
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
	const dstPath = resolve(
		projectRoot,
		"_gen",
		"modules",
		moduleName,
	);
	await emptyDir(dstPath);
	await copy(modulePath, dstPath, { overwrite: true });

	return { genPath: dstPath, sourcePath: modulePath, registry };
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
				.map((x) => resolve(module.path, x));
		files.push(...moduleFiles);
	}
	return files;
}

export async function cleanProject(project: Project) {
	await Deno.remove(resolve(project.path, "_gen"), { recursive: true });
}