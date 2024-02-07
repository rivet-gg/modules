import { Registry } from './registry';
import path from 'path';
import { glob } from 'glob';
import * as tjs from "typescript-json-schema";

export async function compileSchema(registry: Registry): Promise<tjs.Definition> {
    let schemaFiles = await glob(["modules/*/scripts/*.ts"], { cwd: registry.path });
    schemaFiles = schemaFiles.map(p => path.resolve(registry.path, p));

    console.log("Getting program files");
    const program = tjs.getProgramFromFiles(schemaFiles, {
        target: "es2015",
        esModuleInterop: true,
    }, __dirname);

    console.log("Generating schema");
    const schema = tjs.generateSchema(program, "Request", {
        topRef: true,
        required: true,
        strictNullChecks: true,
        noExtraProps: true,
        esModuleInterop: true,
    });
    if (schema === null) throw new Error("Failed to generate schema");

    return schema;
}

