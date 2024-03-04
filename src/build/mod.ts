import { compileSchema } from "./schema.ts";
import { generateEntrypoint } from "./entrypoint.ts";
import { generateOpenApi } from "./openapi.ts";
import { compileScriptHelpers } from "./gen.ts";
import { Project } from "../project/project.ts";
import { generateDenoConfig } from "./deno_config.ts";
import { inflateRuntimeArchive } from "./inflate_runtime_archive.ts";

export async function build(project: Project) {
	console.log("Inflate runtime");
	await inflateRuntimeArchive(project);

	console.log("Compiling schema");
	compileSchema(project);

	console.log("Genreating module helpers");
	await compileScriptHelpers(project);

	console.log("Compiling deno.json");
	await generateDenoConfig(project);

	console.log("Generating entrypoint");
	await generateEntrypoint(project);

	console.log("Generating OpenAPI");
	await generateOpenApi(project);

	console.log("Done");
}
