import { tjs } from "./deps.ts";
import { Project } from "../project/mod.ts";
import { genPath, OPEN_API_PATH } from "../project/project.ts";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";

export const DEFAULT_SERVER = "http://localhost:6420";

// deno-lint-ignore no-explicit-any
type OpenApiDefinition = any;

export async function generateOpenApi(project: Project) {
	const schema: OpenApiDefinition = {
		openapi: "3.1.0",
		info: {
			title: "Open Game Backend",
			version: "1.0.0",
		},
		servers: [
			{
				"description": "Local",
				"url": DEFAULT_SERVER,
			},
		],
		tags: [
			{
				name: "Open Game Backend",
				description: "Open Game Backend",
			},
		],
		paths: {} as Record<string, OpenApiDefinition>,
		components: {
			schemas: {},
		},
	};

	for (const mod of project.modules.values()) {
		for (const script of mod.scripts.values()) {
			if (!script.config.public) continue;

			const requestBodyRef = await injectSchema(
				schema,
				script.requestSchema!,
				`${mod.name}__${script.name}`,
				"Request",
			);
			const responseContentRef = await injectSchema(
				schema,
				script.responseSchema!,
				`${mod.name}__${script.name}`,
				"Response",
			);
			schema.paths[`/modules/${mod.name}/scripts/${script.name}/call`] = {
				post: {
					description: `Call ${mod.name}.${script.name} script.`,
					tags: ["Backend"],
					operationId: `call_${mod.name}_${script.name}`,
					requestBody: {
						content: {
							"application/json": {
								schema: { $ref: requestBodyRef },
							},
						},
					},
					responses: {
						"200": {
							description: "Success",
							content: {
								"application/json": {
									schema: { $ref: responseContentRef },
								},
							},
						},
					},
				},
			};
		}
	}

	await Deno.writeTextFile(
		genPath(project, OPEN_API_PATH),
		JSON.stringify(schema, null, 4),
	);
}

/**
 * Injects a JSON schema in to an OpenAPI schema and returns the reference to the new location.
 *
 * @param openapi The OpenAPI schema to inject the JSON schema in to
 * @param schema The JSON schema to inject
 * @param prefix The prefix to add to the schema names
 * @param rootDefinition The name of the root definition in the JSON schema
 */
async function injectSchema(
	openapi: OpenApiDefinition,
	schema: tjs.Definition,
	prefix: string,
	rootDefinition: string,
) {
	schema = structuredClone(schema);

	// Add the root definition to the OpenAPI schema
	await replaceRefs(
		schema,
		(ref) => ref.replace("#/definitions/", `#/components/schemas/${prefix}__`),
	);
	openapi.components.schemas[`${prefix}__${rootDefinition}`] = schema;

	// Add the definition to the OpenAPI schema and remove it from the JSON schema
	for (const definitionName in schema.definitions) {
		const definition = schema.definitions[definitionName];

		// Add the definition to the OpenAPI schema
		await replaceRefs(
			definition,
			(ref) => ref.replace("#/definitions/", `#/components/schemas/${prefix}__`),
		);
		openapi.components.schemas[await sanitizeRefTypeName(`${prefix}__${definitionName}`)] = definition;
	}
	delete schema.definitions;

	return `#/components/schemas/${prefix}__${rootDefinition}`;
}

/**
 * Recursively replace $ref properties in an object
 */
async function replaceRefs(obj: OpenApiDefinition, replacer: (x: string) => string) {
	for (const key in obj) {
		if (key === "$ref") {
			obj["$ref"] = await sanitizeRefTypeName(replacer(obj[key]));
		} else if (typeof obj[key] === "object") {
			replaceRefs(obj[key], replacer);
		} else if (Array.isArray(obj[key])) {
			for (const item of obj[key]) {
				replaceRefs(item, replacer);
			}
		}
	}
}

/**
 * Sanitize the symbol names to be safe for OpenAPI generators.
 *
 * This is usually a generic type, such as `Record<string, string>`.
 *
 * If the type name is invalid, then a special name will be auto-genreated with
 * the hash of the original name.
 */
async function sanitizeRefTypeName(name: string): Promise<string> {
	const split = name.split("/");
	const type = split[split.length - 1];
	if (type.match(/[^a-zA-Z0-9_]/g)) {
		// HACK: Generate a new type name by hashing the name with special
		// characters to create a new unique type
		const digest = await crypto.subtle.digest(
			"SHA-256",
			new TextEncoder().encode(type),
		);
		const newType = `SpecialType${encodeHex(digest).slice(0, 8)}`;

		// Rebuild ref
		if (split.length > 1) {
			return split.slice(0, split.length - 1).join("/") + "/" + newType;
		} else {
			return newType;
		}
	} else {
		return name;
	}
}
