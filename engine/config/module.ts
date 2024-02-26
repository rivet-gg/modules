import Ajv from "ajv";
import { parse } from "std/yaml/mod.ts";
import * as path from "std/path/mod.ts";
import tjs from "typescript-json-schema";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

export interface ModuleConfig extends Record<string, unknown> {
	status?: "preview" | "beta" | "stable" | "deprecated";
	description?: string;

	/**
	 * The GitHub handle of the authors of the module.
	 */
	authors?: string[];

	scripts: { [name: string]: ScriptConfig };
	errors: { [name: string]: ErrorConfig };
}

export interface ScriptConfig {
	/**
	 * If the script can be called from the public HTTP interface.
	 *
	 * If enabled, ensure that authentication & rate limits are configued for
	 * this endpoints. See the `user` and `rate_limit` modules.
	 *
	 * @default false
	 */
	public?: boolean;
}

export interface ErrorConfig {
	description?: string;
}

const moduleConfigAjv = new Ajv.default({
	schemas: [generateModuleConfigJsonSchema()],
});

export async function readConfig(modulePath: string): Promise<ModuleConfig> {
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

	return config;
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
