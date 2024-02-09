import * as path from "https://deno.land/std/path/mod.ts";
import { glob, tjs } from './deps.ts';
import { Registry } from '../../registry/src/index.ts';

// const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

export async function compileSchema(registry: Registry) {
    for (let module of registry.modules.values()) {
        for (let script of module.scripts.values()) {
            console.log("Generating schema", script.path);

            // TODO: Dupe of registry.ts
            // https://docs.deno.com/runtime/manual/advanced/typescript/configuration#what-an-implied-tsconfigjson-looks-like
            const DEFAULT_COMPILER_OPTIONS = {
                "allowJs": true,
                "esModuleInterop": true,
                "experimentalDecorators": false,
                "inlineSourceMap": true,
                "isolatedModules": true,
                "jsx": "react",
                "module": "esnext",
                "moduleDetection": "force",
                "strict": true,
                "target": "esnext",
                "useDefineForClassFields": true,

                "lib": ["esnext", "dom", "dom.iterable"],
                "allowImportingTsExtensions": true,
            };

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

            const program = tjs.getProgramFromFiles([script.path], DEFAULT_COMPILER_OPTIONS);

            const requestSchema = tjs.generateSchema(program, "Request", validateConfig);
            if (requestSchema === null) throw new Error("Failed to generate request schema for " + script.path);
            script.requestSchema = requestSchema;

            const responseSchema = tjs.generateSchema(program, "Response", validateConfig);
            if (responseSchema === null) throw new Error("Failed to generate response schema for " + script.path);
            script.responseSchema = responseSchema;
        }
    }
}

