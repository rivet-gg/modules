import * as path from "https://deno.land/std/path/mod.ts";
import { glob, tjs } from './deps';
import { Registry } from '../../registry/src/index.ts';

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

export async function compileSchema(registry: Registry): Promise<tjs.Definition> {
    let schemaFiles = await glob(["modules/*/scripts/*.ts"], { cwd: registry.path });
    schemaFiles = schemaFiles.map(p => path.resolve(registry.path, p));

    console.log("Getting program files");
    const program = tjs.getProgramFromFiles(schemaFiles, {
        target: "es2015",
        esModuleInterop: true,
        allowImportingTsExtensions: true,
    }, __dirname);

    console.log("Generating schema");
    const schema = tjs.generateSchema(program, "*", {
        topRef: true,
        required: true,
        strictNullChecks: true,
        noExtraProps: true,
        esModuleInterop: true,

        // TODO: Is this needed?
        include: schemaFiles,

        // TODO: Figure out how to work without this? Maybe we manually validate the request type exists?
        ignoreErrors: true,
    });
    if (schema === null) throw new Error("Failed to generate schema");

    return schema;
}

