import { parse, join, Ajv, tjs } from "../deps.ts";

export interface ProjectConfig extends Record<string, unknown> {
	registries: { [name: string]: RegistryConfig };
	modules: { [name: string]: ProjectModuleConfig };
}

export interface RegistryConfig extends Record<string, unknown> {
	directory?: string;
	// git?: string;
	// branch?: string;
	// rev?: string;
}

// export interface RegistryConfig extends Record<string, unknown> {
// 	name: string;
// 	url: string;
// }

export interface ProjectModuleConfig extends Record<string, unknown> {
	/**
	 * The name of the registry to fetch the module from.
	 */
	registry?: string;

	/**
	 * Overrides the name of the module to fetch inside the registry.
	 */
	module?: string;

	/**
	 * The config to pass to the registry.
	 */
	// config?: any;
}

// export async function readConfig(path: string): Promise<ProjectConfig> {
// 	const configRaw = await Deno.readTextFile(path);
// 	return parse(configRaw) as ProjectConfig;
// }

const projectConfigAjv = new Ajv.default({
	schemas: [generateProjectConfigJsonSchema()],
});

export async function readConfig(projectPath: string): Promise<ProjectConfig> {
	// Read config
	const configRaw = await Deno.readTextFile(
		join(projectPath, "ogs.yaml"),
	);
	const config = parse(configRaw) as ProjectConfig;

	// Validate config
	const projectConfigSchema = projectConfigAjv.getSchema(
		"#/definitions/ProjectConfig",
	);
	if (!projectConfigSchema) {
		throw new Error("Failed to get project config schema");
	}
	if (!projectConfigSchema(config)) {
		throw new Error(
			`Invalid project config: ${JSON.stringify(projectConfigSchema.errors)}`,
		);
	}

	return config;
}

function generateProjectConfigJsonSchema(): tjs.Definition {
	console.log("Generating registry.ts schema");

	const filename = import.meta.filename;
    if (!filename) throw new Error("Missing filename");

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

	const schemaFiles = [filename];

	const program = tjs.getProgramFromFiles(
		schemaFiles,
		DEFAULT_COMPILER_OPTIONS,
	);

	const schema = tjs.generateSchema(program, "ProjectConfig", {
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
