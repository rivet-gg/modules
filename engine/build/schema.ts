import * as path from "std/path/mod.ts";
import * as glob from "glob";
import tjs from "typescript-json-schema";
import { Registry } from "../registry/mod.ts";

// const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

export async function compileSchema(registry: Registry) {
	for (const module of registry.modules.values()) {
		for (const script of module.scripts.values()) {
			console.log("Generating schema", script.path);

			// TODO: Dupe of registry.ts
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

			const validateConfig = {
				topRef: true,
				required: true,
				strictNullChecks: true,
				noExtraProps: true,
				esModuleInterop: true,

				// TODO: Is this needed?
				include: [script.path],

				// TODO: Figure out how to work without this? Maybe we manually validate the request type exists?
				ignoreErrors: true,
			};

			const program = tjs.getProgramFromFiles(
				[script.path],
				DEFAULT_COMPILER_OPTIONS,
			);

			const requestSchema = tjs.generateSchema(
				program,
				"Request",
				validateConfig,
				[script.path],
			);
			if (requestSchema === null) {
				throw new Error("Failed to generate request schema for " + script.path);
			}
			// patchSchema(null, requestSchema);
			script.requestSchema = requestSchema;

			const responseSchema = tjs.generateSchema(
				program,
				"Response",
				validateConfig,
				[script.path],
			);
			if (responseSchema === null) {
				throw new Error(
					"Failed to generate response schema for " + script.path,
				);
			}
			// patchSchema(null, responseSchema);
			script.responseSchema = responseSchema;
		}
	}
}

// function patchSchema(name: string | null, schema: tjs.DefinitionOrBoolean) {
//     if (typeof schema === "boolean") return;

//     if (name && name.startsWith("Record<") && schema.type == "object") {
//         console.log('Patching', name, schema);
//         schema.type = "object";
//         schema.additionalProperties = {};
//     }

//     // Recursively patch schemas
//     if (schema.definitions) {
//         for (const key in schema.definitions) {
//             patchSchema(key, schema.definitions[key]);
//         }
//     } else if (schema.properties) {
//         for (const key in schema.properties) {
//             patchSchema(key, schema.properties[key]);
//         }
//     } else if (schema.items) {
//         if (typeof schema.items === "boolean") return;
//         else if (Array.isArray(schema.items)) {
//             for (const item of schema.items) {
//                 patchSchema(null, item);
//             }
//         } else {
//             patchSchema(null, schema.items);
//         }
//     }
// }
