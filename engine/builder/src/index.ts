import { Registry } from "./registry";
import path from "path";
import { compileSchema } from './schema';
import { generateEntrypoint } from './entrypoint';

async function main() {
    // Load registry
    let rootPath = path.join(__dirname, "..", "..", "..");
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

