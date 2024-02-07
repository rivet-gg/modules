import * as path from "https://deno.land/std/path/mod.ts";
import { Registry } from "../../registry/src/index.ts";
import { compileSchema } from './schema.ts';
import { generateEntrypoint } from './entrypoint.ts';

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

async function main() {
    // Load registry
    let rootPath = path.join(__dirname, '..', '..', '..');
    let registry = await Registry.load(rootPath);

    // Compile schema
    console.log('Compiling schema');
    let schema = await compileSchema(registry);

    // Generate entrypoint
    console.log('Generating entrypoint');
    await generateEntrypoint(registry, schema);

    console.log('Done');
}

main();

