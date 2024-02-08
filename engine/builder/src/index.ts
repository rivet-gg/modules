import * as path from "https://deno.land/std/path/mod.ts";
import { Registry } from "../../registry/src/index.ts";
import { compileSchema } from './schema.ts';
import { generateEntrypoint } from './entrypoint.ts';
import { generateOpenApi } from './openapi.ts';

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

async function main() {
    // Load registry
    let rootPath = path.join(__dirname, '..', '..', '..');
    let registry = await Registry.load(rootPath);

    console.log('Compiling schema');
    await compileSchema(registry);

    console.log('Generating entrypoint');
    await generateEntrypoint(registry);

    console.log('Generating OpenAPI');
    await generateOpenApi(registry);

    console.log('Done');
}

main();

