import * as path from "std/path/mod.ts";
import { Registry } from "../registry/mod.ts";
import { compileSchema } from './schema.ts';
import { generateEntrypoint } from './entrypoint.ts';
import { generateOpenApi } from './openapi.ts';

// Load registry
const registry = await Registry.load();

console.log('Compiling schema');
await compileSchema(registry);

console.log('Generating entrypoint');
await generateEntrypoint(registry);

console.log('Generating OpenAPI');
await generateOpenApi(registry);

console.log('Done');
