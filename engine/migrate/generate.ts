import { copy, exists } from "std/fs/mod.ts";
import * as path from "std/path/mod.ts";

const tempDir = await Deno.makeTempDir();
const originalDir = path.join(Deno.cwd(), "modules/users/db");
const originalMigrationsDir = path.join(originalDir, "migrations");

// Duplicate db directory
console.log('Copying', originalDir, 'to', tempDir);
await copy(originalDir, tempDir, { overwrite: true });

// Install required packages
console.log('Installing required packages');
await new Deno.Command("npm", {
    args: ["install", "drizzle-orm", "postgres"],
    cwd: tempDir,
}).output();
await new Deno.Command("npm", {
    args: ["install", "-D", "drizzle-kit"],
    cwd: tempDir,
}).output();

// Write drizzle.config.json
console.log('Writing drizzle.config.json');
const configPath = path.join(tempDir, "drizzle.config.json");
await Deno.writeTextFile(configPath, JSON.stringify({
    schema: "./schema.ts",
    out: "./migrations",
}));

// Generate migrations
console.log('Generating migrations');
await new Deno.Command("npx", {
    args: ["drizzle-kit", "generate:pg"],
    cwd: tempDir,
}).output();

// Copy back migrations dir
console.log('Copying migrations back');
const migrationsDir = path.join(tempDir, "migrations");
if (await exists(migrationsDir)) {
    await copy(migrationsDir, originalMigrationsDir, { overwrite: true });
}