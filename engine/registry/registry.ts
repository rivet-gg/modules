import * as path from "std/path/mod.ts";
import { parse } from "std/yaml/mod.ts";
import Ajv from "ajv";
import { glob } from "glob";
import tjs from "typescript-json-schema";

// TODO: Clean this up
import { fileURLToPath } from "node:url";
import { ModuleConfig, ScriptConfig } from "./module_config.ts";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const moduleConfigAjv = new Ajv.default({
	schemas: [generateModuleConfigJsonSchema()],
});

export interface Registry {
	path: string;
	modules: Map<string, Module>;
}

export interface Module {
	path: string;
	name: string;
	configRaw: string;
	config: ModuleConfig;
	scripts: Map<string, Script>;
	db?: ModuleDatabase;
}

export interface ModuleDatabase {
	name: string;
}

export interface Script {
	path: string;
	name: string;
	config: ScriptConfig;

	requestSchema?: tjs.Definition;
	responseSchema?: tjs.Definition;
}

export async function loadRegistry(): Promise<Registry> {
	const rootPath = path.join(__dirname, "..", "..");

	console.log("Loading registry", rootPath);

	const modPaths = await glob("modules/*/module.yaml", { cwd: rootPath });
	const modules = new Map();
	for (const mod of modPaths) {
		const modName = path.basename(path.dirname(mod));
		modules.set(
			modName,
			await loadModule(path.join(rootPath, path.dirname(mod)), modName),
		);
	}
	return { path: rootPath, modules };
}

async function loadModule(modulePath: string, name: string): Promise<Module> {
	console.log("Loading module", modulePath);

	// Read config
	const configRaw = await Deno.readTextFile(
		path.join(modulePath, "module.yaml"),
	);
	const config = parse(configRaw) as ModuleConfig;

	// Validate config
	const moduleConfigSchema = moduleConfigAjv.getSchema(
		"#/definitions/ModuleConfig",
	);
	if (!moduleConfigSchema) {
		throw new Error("Failed to get module config schema");
	}
	if (!moduleConfigSchema(config)) {
		throw new Error(
			`Invalid module config: ${JSON.stringify(moduleConfigSchema.errors)}`,
		);
	}

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
		if (!await Deno.stat(scriptPath)) {
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
	if (await Deno.stat(path.join(modulePath, "db"))) {
		db = {
			name: `module_${name.replace("-", "_")}`,
		};
	}

	return {
		path: modulePath,
		name,
		configRaw,
		config,
		scripts,
		db,
	};
}

export function scriptDistHelperPath(registry: Registry, module: Module, script: Script): string {
	return path.join(
		registry.path,
		"dist",
		"helpers",
		module.name,
		"scripts",
		script.name + ".ts",
	);
}

export function testDistHelperPath(registry: Registry, module: Module): string {
	return path.join(
		registry.path,
		"dist",
		"helpers",
		module.name,
		"test.ts"
	);
}

function generateModuleConfigJsonSchema(): tjs.Definition {
	console.log("Generating registry.ts schema");

	// https://docs.deno.com/runtime/manual/advanced/typescript/configuration#what-an-implied-tsconfigjson-looks-like
	const DEFAULT_COMPILER_OPTIONS = {
		"allowJs": true,
		"esModuleInterop": true,
		"experimentalDecorators": false,
		"inlineSourceMap": true,
		"isolatedModules": true,
		"jsx": "react",
		"module": "esnext",
		"moduleDetection": "force",
		"strict": true,
		"target": "esnext",
		"useDefineForClassFields": true,

		"lib": ["esnext", "dom", "dom.iterable"],
		"allowImportingTsExtensions": true,
	};

	const schemaFiles = [__filename];

	const program = tjs.getProgramFromFiles(
		schemaFiles,
		DEFAULT_COMPILER_OPTIONS,
	);

	const schema = tjs.generateSchema(program, "ModuleConfig", {
		topRef: true,
		required: true,
		strictNullChecks: true,
		noExtraProps: true,
		esModuleInterop: true,

		// TODO: Is this needed?
		include: schemaFiles,

		// TODO: Figure out how to work without this? Maybe we manually validate the request type exists?
		ignoreErrors: true,
	});
	if (schema == null) throw new Error("Failed to generate schema");

	return schema;
}
