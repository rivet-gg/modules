import { compileSchema } from "./schema.ts";
import { generateEntrypoint } from "./entrypoint.ts";
import { generateOpenApi } from "./openapi.ts";
import { compileScriptHelpers } from "./gen.ts";
import { Project } from "../project/project.ts";
import { generateDenoConfig } from "./deno_config.ts";

export async function build(project: Project) {
	console.log("Compiling schema");
	compileSchema(project);

	console.log("Genreating module helpers");
	compileScriptHelpers(project);

	console.log("Compiling deno.json");
	generateDenoConfig(project);

	console.log("Generating entrypoint");
	await generateEntrypoint(project);

	console.log("Generating OpenAPI");
	await generateOpenApi(project);

	console.log("Done");
}
