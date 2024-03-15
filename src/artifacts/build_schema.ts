// deno task artifacts:build:schema
//
// Generates schema JSON from the module & project config

import { tjs } from "./deps.ts";
import { dirname as parent, resolve } from "../deps.ts";

const dirname = import.meta.dirname;
if (!dirname) throw new Error("Missing dirname");

await Deno.mkdir(resolve(dirname, "..", "..", "artifacts")).catch((e) => {
	if (!(e instanceof Deno.errors.AlreadyExists)) throw e;
});

const CONFIGS = [
	{
		name: "module",
		type: "ModuleConfig",
	},
	{
		name: "project",
		type: "ProjectConfig",
	},
];

for (const { name, type } of CONFIGS) {
	const srcFileName = `${name}.ts`;
	const schemaFileName = `${name}_schema.json`;

	const srcPath = resolve(dirname, "..", "config", srcFileName);
	const schemaPath = resolve(dirname, "..", "..", "artifacts", schemaFileName);

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

	const schemaFiles = [srcPath];

	const program = tjs.getProgramFromFiles(
		schemaFiles,
		DEFAULT_COMPILER_OPTIONS,
	);

	const schema = tjs.generateSchema(program, type, {
		esModuleInterop: true,
		noExtraProps: true,
		required: true,
		strictNullChecks: true,

		// TODO: Is this needed?
		include: schemaFiles,

		// TODO: Figure out how to work without this? Maybe we manually validate the request type exists?
		ignoreErrors: true,
	});
	if (schema == null) throw new Error("Failed to generate schema");

	// Create artifacts folder if it doesn't already exist
	await Deno.mkdir(parent(schemaPath), { recursive: true });

	// Write schema to file
	await Deno.writeTextFile(schemaPath, JSON.stringify(schema));
}
