import { exists, resolve } from "../deps.ts";
import { glob } from "./deps.ts";
import { readConfig as readModuleConfig } from "../config/module.ts";
import { ModuleConfig } from "../config/module.ts";
import { Script } from "./script.ts";
import { Project } from "./project.ts";
import { Registry } from "./registry.ts";
import { validateIdentifier } from "../types/identifiers/mod.ts";
import { IdentType } from "../types/identifiers/defs.ts";

export interface Module {
	/**
	 * The path to the module in the project's _gen directory.
	 * 
	 * This path can be modified and will be discarded on the next codegen.
	 */
	path: string;
	
	/**
	 * The path to the module's source code.
	 * 
	 * This path almost never be modified (including _gen), except for
	 * exclusions where auto-generating code (e.g. prisma migrate dev).
	 */
	sourcePath: string;

	name: string;
	config: ModuleConfig;
	registry: Registry,
	scripts: Map<string, Script>;
	db?: ModuleDatabase;
}

export interface ModuleDatabase {
	name: string;
}

export async function loadModule(
	modulePath: string,
	sourcePath: string,
	name: string,
	registry: Registry,
): Promise<Module> {
	// Read config
	const config = await readModuleConfig(modulePath);

	// Find names of the expected scripts to find. Used to print error for extra scripts.
	const scriptsPath = resolve(modulePath, "scripts");
	const expectedScripts = new Set(
		await glob.glob("*.ts", { cwd: resolve(modulePath, "scripts") }),
	);

	// Read scripts
	const scripts = new Map<string, Script>();
	for (const scriptName in config.scripts) {
		const scriptNameIssue = validateIdentifier(scriptName, IdentType.ModuleScripts);
		if (scriptNameIssue) {
			throw new Error(scriptNameIssue.toString("script"));
		}

		// Load script
		const scriptPath = resolve(
			scriptsPath,
			scriptName + ".ts",
		);
		if (!await exists(scriptPath)) {
			throw new Error(
				`Script not found: ${scriptPath}\nCheck the scripts in your module.yaml are configured correctly.`,
			);
		}

		const script: Script = {
			path: scriptPath,
			name: scriptName,
			config: config.scripts[scriptName],
		};
		scripts.set(scriptName, script);

		// Remove script
		expectedScripts.delete(scriptName + ".ts");
	}

	// Throw error extra scripts
	if (expectedScripts.size > 0) {
		const scriptList = Array.from(expectedScripts).map((x) =>
			`- ${resolve(scriptsPath, x)}\n`
		);
		throw new Error(
			`Found extra scripts not registered in module.yaml:\n\n${
				scriptList.join("")
			}\nAdd these scripts to the module.yaml file.`,
		);
	}

	// Verify error names
	for (const errorName in config.errors) {
		const errorNameIssue = validateIdentifier(errorName, IdentType.Errors);
		if (errorNameIssue) {
			throw new Error(errorNameIssue.toString("error"));
		}
	}

	// Load db config
	let db: ModuleDatabase | undefined = undefined;
	if (await exists(resolve(modulePath, "db"), { isDirectory: true })) {
		db = {
			name: name.replace("-", "_"),
		};
	}

	return {
		path: modulePath,
		sourcePath,
		name,
		config,
		registry,
		scripts,
		db,
	};
}

export function moduleGenPath(
	_project: Project,
	module: Module,
): string {
	return resolve(
		module.path,
		"_gen",
		"mod.ts",
	);
}

export function testGenPath(_project: Project, module: Module): string {
	return resolve(
		module.path,
		"_gen",
		"test.ts",
	);
}

export function typeGenPath(_project: Project, module: Module): string {
	return resolve(
		module.path,
		"_gen",
		"registry.d.ts",
	);
}
