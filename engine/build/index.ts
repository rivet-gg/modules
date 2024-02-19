import { compileSchema } from "./schema.ts";
import { generateEntrypoint } from "./entrypoint.ts";
import { generateOpenApi } from "./openapi.ts";
import { compileScriptHelpers } from "./helper.ts";
import { loadRegistry } from "../registry/registry.ts";

// Load registry
const registry = await loadRegistry();

console.log("Compiling schema");
compileSchema(registry);

console.log("Compiling scripts");
compileScriptHelpers(registry);

console.log("Generating entrypoint");
await generateEntrypoint(registry);

console.log("Generating OpenAPI");
await generateOpenApi(registry);

console.log("Done");
