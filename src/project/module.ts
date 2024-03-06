import { join, exists } from "../deps.ts";
import { glob } from "./deps.ts";
import { readConfig as readModuleConfig } from "../config/module.ts";
import { ModuleConfig } from "../config/module.ts";
import { Script } from "./script.ts";
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
	// Read config
	const config = await readModuleConfig(modulePath);

	// Find names of the expected scripts to find. Used to print error for extra scripts.
	const scriptsPath = join(modulePath, "scripts");
	const expectedScripts = new Set(
		await glob.glob("*.ts", { cwd: join(modulePath, "scripts") }),
	);

	// Read scripts
	const scripts = new Map();
	for (const scriptName in config.scripts) {
		// Load script
		const scriptPath = join(
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
			`- ${join(scriptsPath, x)}\n`
		);
		throw new Error(
			`Found extra scripts not registered in module.yaml:\n\n${
				scriptList.join("")
			}\nAdd these scripts to the module.yaml file.`,
		);
	}

	// Load db config
	let db: ModuleDatabase | undefined = undefined;
	if (await exists(join(modulePath, "db"), { isDirectory: true })) {
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

export function moduleGenPath(
	_project: Project,
	module: Module,
): string {
	return join(
		module.path,
		"_gen",
		"mod.ts",
	);
}

export function testGenPath(_project: Project, module: Module): string {
	return join(
		module.path,
		"_gen",
		"test.ts",
	);
}

export function typeGenPath(_project: Project, module: Module): string {
	return join(
		module.path,
		"_gen",
		"registry.d.ts",
	);
}
