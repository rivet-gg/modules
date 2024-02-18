// Generates SQL migrations & generates client library.
//
// Wrapper around `prisma migrate dev`

import { buildPrismaPackage } from "./build_prisma_esm.ts";
import { loadRegistry } from "../registry/mod.ts";
import { forEachPrismaSchema } from "./mod.ts";
import { copy, exists } from "std/fs/mod.ts";
import * as path from "std/path/mod.ts";

const registry = await loadRegistry();

forEachPrismaSchema(registry, async ({ databaseUrl, module, tempDir, generatedClientDir }) => { 
    // Generate migrations & client
    console.log('Generating migrations');
    const status = await new Deno.Command("deno", {
        args: ["run", "-A", "npm:prisma@5.9.1", "migrate", "dev"],
        cwd: tempDir,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
        env: {
            DATABASE_URL: databaseUrl,
            PRISMA_CLIENT_FORCE_WASM: "true",
        },
    }).output();
    if (!status.success) {
        throw new Error("Failed to generate migrations");
    }

    // Specify the path to the library & binary types
    await (async () => {
        for (const filename of ["index.d.ts", "default.d.ts"]) {
            const filePath = path.join(generatedClientDir, filename);
            let content = await Deno.readTextFile(filePath);
            const replaceLineA = `import * as runtime from './runtime/library.js'`;
            const replaceLineB = `import * as runtime from './runtime/binary.js'`;
            content = content
                .replace(replaceLineA, `// @deno-types="./runtime/library.d.ts"\n${replaceLineA}`)
                .replace(replaceLineB, `// @deno-types="./runtime/binary.d.ts"\n${replaceLineB}`)
                .replace(/from '.\/default'/g, `from './default.d.ts'`);
            await Deno.writeTextFile(filePath, content);
        }
    })()

    // Fix suffix on imports
    await (async () => {
        const filePath = path.join(generatedClientDir, "runtime", "binary.d.ts");
        let content = await Deno.readTextFile(filePath);
        const replaceLineA = `export * from "./library"`;
        content = content
            .replace(replaceLineA, `export * from "./library.d.ts"`);
        await Deno.writeTextFile(filePath, content);
    })()

    // Compile the ESM library
    console.log('Compiling ESM library');
    buildPrismaPackage(generatedClientDir, path.join(generatedClientDir, "esm.js"));

    // Copy back migrations dir
    console.log('Copying migrations back');
    const tempMigrationsDir = path.join(tempDir, "migrations");
    const migrationsDir = path.join(module.path, "db", "migrations");
    if (await exists(tempMigrationsDir)) {
        await copy(tempMigrationsDir, migrationsDir, { overwrite: true });
    }
});
