import * as path from "https://deno.land/std/path/mod.ts";
import { glob, tjs } from './deps.ts';
import { Registry } from '../../registry/src/index.ts';

// const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

export async function compileSchema(registry: Registry) {
    for (let module of registry.modules.values()) {
        for (let script of module.scripts.values()) {
            console.log("Generating schema", script.path);

            const validateConfig = {
                topRef: true,
                required: true,
                strictNullChecks: true,
                noExtraProps: true,
                esModuleInterop: true,

                // TODO: Is this needed?
                include: [script.path],

                // TODO: Figure out how to work without this? Maybe we manually validate the request type exists?
                ignoreErrors: true,
            };

            const program = tjs.getProgramFromFiles([script.path], {
                target: "es2015",
                esModuleInterop: true,
                allowImportingTsExtensions: true,
            });

            const requestSchema = tjs.generateSchema(program, "Request", validateConfig);
            if (requestSchema === null) throw new Error("Failed to generate request schema for " + script.path);
            script.requestSchema = requestSchema;

            const responseSchema = tjs.generateSchema(program, "Response", validateConfig);
            if (responseSchema === null) throw new Error("Failed to generate response schema for " + script.path);
            script.responseSchema = responseSchema;
        }
    }
}

