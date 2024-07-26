import { Project } from "../project/mod.ts";
import { genPath, OPEN_API_PATH } from "../project/project.ts";
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

	const document = generator.generateDocument({
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

	await Deno.writeTextFile(
		genPath(project, OPEN_API_PATH),
		JSON.stringify(document, null, 4),
	);
}
