import { readConfig as readModuleConfig } from "../config/module.ts";
import * as path from "std/path/mod.ts";
import { ModuleConfig } from "../config/module.ts";
import { Script } from "./script.ts";
import { exists } from "std/fs/mod.ts";
import { glob } from "glob";
import { Project } from "./project.ts";

export interface Module {
	path: string;
	name: string;
	config: ModuleConfig;
	scripts: Map<string, Script>;
	db?: ModuleDatabase;
}

export interface ModuleDatabase {
	name: string;
}

export async function loadModule(
	modulePath: string,
	name: string,
): Promise<Module> {
	console.log("Loading module", modulePath);

	// Read config
	const config = await readModuleConfig(modulePath);

	// Find names of the expected scripts to find. Used to print error for extra scripts.
	const scriptsPath = path.join(modulePath, "scripts");
	const expectedScripts = new Set(
		await glob("*.ts", { cwd: path.join(modulePath, "scripts") }),
	);

	// Read scripts
	const scripts = new Map();
	for (const scriptName in config.scripts) {
		// Load script
		const scriptPath = path.join(
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
			`- ${path.join(scriptsPath, x)}\n`
		);
		throw new Error(
			`Found extra scripts not registered in module.yaml:\n\n${
				scriptList.join("")
			}\nAdd these scripts to the module.yaml file.`,
		);
	}

	// Load db config
	let db: ModuleDatabase | undefined = undefined;
	if (await exists(path.join(modulePath, "db"), { isDirectory: true })) {
		db = {
			name: `module_${name.replace("-", "_")}`,
		};
	}

	return {
		path: modulePath,
		name,
		config,
		scripts,
		db,
	};
}

/**
 * Get the path to the dist/helpers/{}/mod.ts
 */
export function moduleDistHelperPath(
	project: Project,
	module: Module,
): string {
	return path.join(
		project.path,
		"dist",
		"helpers",
		module.name,
		"mod.ts",
	);
}

/**
 * Get the path to the dist/helpers/{}/test.ts
 */
export function testDistHelperPath(project: Project, module: Module): string {
	return path.join(
		project.path,
		"dist",
		"helpers",
		module.name,
		"test.ts",
	);
}
