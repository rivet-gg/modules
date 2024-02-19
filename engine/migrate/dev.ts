// Generates SQL migrations & generates client library.
//
// Wrapper around `prisma migrate dev`

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
            DATABASE_URL: databaseUrl
        },
    }).output();
    if (!status.success) {
        throw new Error("Failed to generate migrations");
    }

    // Replace all imports of ".js" with ".d.ts" in generated Prisma client to fix compatability with Deno
    // console.log('Replacing imports');
    // const clientFiles = [
    //     "index.d.ts",
    //     "runtime/library.d.ts",
    // ];
    // for (const file of clientFiles) {
    //     const filePath = path.join(generatedClientDir, file);
    //     const content = await Deno.readTextFile(filePath);
    //     const newContent = content.replace(/import (.*)\.js(["'])/g, "import $1.d.ts$2");
    //     await Deno.writeTextFile(filePath, newContent);
    // }

    // Copy back migrations dir
    console.log('Copying migrations back');
    const tempMigrationsDir = path.join(tempDir, "migrations");
    const migrationsDir = path.join(module.path, "db", "migrations");
    if (await exists(tempMigrationsDir)) {
        await copy(tempMigrationsDir, migrationsDir, { overwrite: true });
    }
});
