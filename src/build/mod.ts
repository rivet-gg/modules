import { compileSchema } from "./schema.ts";
import { generateEntrypoint } from "./entrypoint.ts";
import { generateOpenApi } from "./openapi.ts";
import { compileScriptHelpers } from "./helper.ts";
import { Project } from "../project/project.ts";

export async function build(project: Project) {
    console.log("Compiling schema");
    compileSchema(project);

    console.log("Compiling scripts");
    compileScriptHelpers(project);

    console.log("Generating entrypoint");
    await generateEntrypoint(project);

    console.log("Generating OpenAPI");
    await generateOpenApi(project);

    console.log("Done");
}