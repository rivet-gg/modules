import * as path from "std/path/mod.ts";
import { Registry } from "../registry/mod.ts";

export async function generateOpenApi(registry: Registry) {
	const schema = {
		openapi: "3.1.0",
		info: {
			title: "Open Game Services",
			version: "1.0.0",
		},
		servers: [
			{
				"description": "Local",
				"url": "http://localhost:8080",
			},
		],
		tags: [
			{
				name: "OGS",
				description: "Open Game Services",
			},
		],
		paths: {} as Record<string, any>,
		components: {
			schemas: {},
		},
	};

	for (const mod of registry.modules.values()) {
		for (const script of mod.scripts.values()) {
			const requestBodyRef = injectSchema(
				schema,
				script.requestSchema,
				`${mod.name}__${script.name}__request`,
				"Request",
			);
			const responseContentRef = injectSchema(
				schema,
				script.responseSchema,
				`${mod.name}__${script.name}__response`,
				"Response",
			);
			schema.paths[`/modules/${mod.name}/scripts/${script.name}/call`] = {
				post: {
					description: "Call ${mod.name}.${script.name} script.",
					tags: ["OGS"],
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
		path.join(registry.path, "dist", "openapi.json"),
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
function injectSchema(
	openapi: any,
	schema: any,
	prefix: string,
	rootDefinition: string,
) {
	// Add the definition to the OpenAPI schema
	for (const definitionName in schema.definitions) {
		const definition = schema.definitions[definitionName];

		// Update $refs to point to the new location
		replaceRefs(
			definition,
			(ref) =>
				ref.replace("#/definitions/", `#/components/schemas/${prefix}__`),
		);

		// Add the definition to the OpenAPI schema
		openapi.components.schemas[`${prefix}__${definitionName}`] = definition;
	}

	return `#/components/schemas/${prefix}__${rootDefinition}`;
}

/**
 * Recursively replace $ref properties in an object
 */
function replaceRefs(obj: any, replacer: (x: string) => string) {
	for (const key in obj) {
		if (key === "$ref") {
			obj[key] = replacer(obj[key]);
		} else if (typeof obj[key] === "object") {
			replaceRefs(obj[key], replacer);
		} else if (Array.isArray(obj[key])) {
			for (const item of obj[key]) {
				replaceRefs(item, replacer);
			}
		}
	}
}
