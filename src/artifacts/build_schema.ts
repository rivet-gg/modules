// deno task artifact:gen_schema
//
// Generates schema JSON from the module & project config

import { join, tjs } from "../deps.ts";

const dirname = import.meta.dirname;
if (!dirname) throw new Error("Missing dirname");

const CONFIGS = [
    {
        name: "module",
        type: "ModuleConfig",
    },
    {
        name: "project",
        type: "ProjectConfig",
    },
]

for (const { name, type } of CONFIGS) {
    const srcFileName = `${name}.ts`;
    const schemaFileName = `${name}_schema.json`;

    const srcPath = join(dirname, "..", "config", srcFileName);
    const schemaPath = join(dirname, "..", "..", "artifacts", schemaFileName);

    console.log(`Generating schema for ${srcPath} -> ${schemaPath}`);

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

    const schemaFiles = [srcPath];

    const program = tjs.getProgramFromFiles(
        schemaFiles,
        DEFAULT_COMPILER_OPTIONS,
    );

    const schema = tjs.generateSchema(program, type, {
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
    if (schema == null) throw new Error("Failed to generate schema");

    await Deno.writeTextFile(schemaPath, JSON.stringify(schema, null, '\t'))
}