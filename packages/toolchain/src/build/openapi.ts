import { Project } from "../project/mod.ts";
import { projectGenPath, OPEN_API_PATH } from "../project/project.ts";
import { OpenApiGeneratorV31, OpenAPIRegistry } from "./schema/deps.ts";
import { convertSerializedSchemaToZod } from "./schema/mod.ts";

export const DEFAULT_SERVER = "http://localhost:6420";

export async function generateOpenApi(project: Project) {
	const registry = new OpenAPIRegistry();

	for (const mod of project.modules.values()) {
		for (const script of mod.scripts.values()) {
			if (!script.config.public) continue;

			const requestRef = `${mod.name}__${script.name}__Request`;
			const responseRef = `${mod.name}__${script.name}__Response`;

			registry.registerPath({
				method: "post",
				path: `/modules/${mod.name}/scripts/${script.name}/call`,
				description: `Call ${mod.name}.${script.name} script.`,
				tags: ["Backend"],
				request: {
					body: {
						required: true,
						content: {
							"application/json": {
								schema: convertSerializedSchemaToZod(script.schemas?.request!).openapi(requestRef),
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Success",
						content: {
							"application/json": {
								schema: convertSerializedSchemaToZod(script.schemas?.response!).openapi(responseRef),
							},
						},
					},
				},
			});
		}
	}

	const generator = new OpenApiGeneratorV31(registry.definitions);

	let document = generator.generateDocument({
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
	});

  // Remove uses of complex OpenAPI types that are usually buggy in OpenAPI
  // generators.
  document = flattenOpenAPIConfig(document);

	await Deno.writeTextFile(
		projectGenPath(project, OPEN_API_PATH),
		JSON.stringify(document, null, 4),
	);
}

// MARK: Flatten OpenAPI Config
function isReferenceObject(obj: any): boolean {
  return obj && typeof obj === 'object' && '$ref' in obj;
}

function flattenAnyOf(schema: any): any {
  if (isReferenceObject(schema)) {
    return {};
  }

  if (Array.isArray(schema.anyOf)) {
    const flattenedSchema: any = {
      type: 'object',
      properties: {},
    };

    for (const subSchema of schema.anyOf) {
      const flattened = flattenAnyOf(subSchema);
      if (flattened.properties) {
        Object.assign(flattenedSchema.properties, flattened.properties);
      }
      if (Array.isArray(flattened.required)) {
        for (const prop of flattened.required) {
          if (flattenedSchema.properties && flattenedSchema.properties[prop]) {
            flattenedSchema.properties[prop] = {
              ...flattenedSchema.properties[prop],
              nullable: true,
            };
          }
        }
      }
    }

    return flattenedSchema;
  }

  if (schema.properties && typeof schema.properties === 'object') {
    const flattenedProperties: Record<string, any> = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      flattenedProperties[key] = flattenAnyOf(value);
    }
    return {
      ...schema,
      properties: flattenedProperties,
    };
  }

  return schema;
}

function flattenOpenAPIConfig(config: any): any {
  const flattenedPaths: Record<string, any> = {};
  const flattenedComponents: Record<string, any> = { schemas: {} };

  // Flatten paths
  if (typeof config.paths === 'object') {
    for (const [path, pathItem] of Object.entries(config.paths)) {
      if (pathItem == null) continue;
      flattenedPaths[path] = {};
      if (typeof pathItem === 'object') {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (operation == null) continue;
          if (method === 'parameters' || method === '$ref') continue;
          if (typeof operation === 'object') {
            flattenedPaths[path][method] = {
              ...operation,
              parameters: Array.isArray(operation.parameters)
                ? operation.parameters.map((param: any) => {
                    if (isReferenceObject(param)) return param;
                    return {
                      ...param,
                      schema: param.schema ? flattenAnyOf(param.schema) : undefined,
                    };
                  })
                : undefined,
              requestBody: operation.requestBody && !isReferenceObject(operation.requestBody)
                ? {
                    ...operation.requestBody,
                    content: typeof operation.requestBody.content === 'object'
                      ? Object.fromEntries(
                          Object.entries(operation.requestBody.content).map(([mediaType, mediaTypeObject]: [string, any]) => [
                            mediaType,
                            {
                              ...mediaTypeObject,
                              schema: mediaTypeObject.schema ? flattenAnyOf(mediaTypeObject.schema) : undefined,
                            },
                          ])
                        )
                      : undefined,
                  }
                : operation.requestBody,
            };
          }
        }
      }
    }
  }

  // Flatten components schemas
  if (config.components && typeof config.components.schemas === 'object') {
    for (const [schemaName, schema] of Object.entries(config.components.schemas)) {
      flattenedComponents.schemas[schemaName] = flattenAnyOf(schema);
    }
  }

  return {
    ...config,
    paths: flattenedPaths,
    components: {
      ...config.components,
      schemas: flattenedComponents.schemas,
    },
  };
}

