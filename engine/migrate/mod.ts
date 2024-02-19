import { Registry, Module, ModuleDatabase } from "../registry/mod.ts";
import { assertValidString } from "./validate.ts";
import { Client as PostgresClient } from "postgres/mod.ts";
import * as path from "std/path/mod.ts";
import { copy, exists } from "std/fs/mod.ts";

export type ForEachDatabaseCallback = (opts: { databaseUrl: string, module: Module, db: ModuleDatabase }) => Promise<void>;
export type ForEachPrismaSchemaCallback = (opts: { databaseUrl: string, module: Module, db: ModuleDatabase, tempDir: string, generatedClientDir: string }) => Promise<void>;

/** Prepares all databases and calls a callback once prepared. */
export async function forEachDatabase(registry: Registry, callback: ForEachDatabaseCallback) {
	// Setup database
	const defaultDatabaseUrl = Deno.env.get("DATABASE_URL") ??
		"postgres://postgres:password@localhost:5432/postgres";

    // Create client that connects to the default database
	const defaultClient = new PostgresClient(defaultDatabaseUrl);
	await defaultClient.connect();

	try {
		for (const mod of registry.modules.values()) {
			if (!mod.db) continue;

            // Create database
            await createDatabases(defaultClient, mod.db);

            // Build URL
            const urlParsed = new URL(defaultDatabaseUrl);
            urlParsed.pathname = `/${mod.db.name}`;
            const databaseUrl = urlParsed.toString();

            // Callback
            await callback({ databaseUrl, module: mod, db: mod.db });
		}
	} catch (cause) {
		throw new Error("Failed to create databases", { cause });
	} finally {
		await defaultClient.end();
	}
}

/** Prepares the Postgres database & creates a temporary Prisma project for each database. */
export async function forEachPrismaSchema(registry: Registry, callback: ForEachPrismaSchemaCallback) {
    forEachDatabase(registry, async ({ databaseUrl, module, db }) => {
        const tempDir = await Deno.makeTempDir();
        const dbDir = path.join(module.path, "db");
        const generatedClientDir = path.join(registry.path, "dist", "prisma", module.name)

        // Duplicate db directory
        console.log('Copying', dbDir, 'to', tempDir);
        await copy(dbDir, tempDir, { overwrite: true });

        // TODO: This causes a weird error
        // // Write package.json
        // console.log('Writing package.json');
        // const packageJsonPath = path.join(tempDir, "package.json");
        // const packageJson = JSON.stringify({
        //     "devDependencies": {
        //         "prisma": "^5.9.1"
        //     },
        //     "dependencies": {
        //         "@prisma/client": "^5.9.1"
        //     },
        //     "node": {
        //         "target": "20.11.1"
        //     }
        // });
        // await Deno.writeTextFile(packageJsonPath, packageJson);

        // Append generator config
        console.log('Appending code to schema.prisma');
        const tempSchemaPath = path.join(tempDir, "schema.prisma");
        let schema = await Deno.readTextFile(tempSchemaPath);
        schema += `
generator client {
    provider = "prisma-client-js"
    previewFeatures = ["deno"]
    output = "${generatedClientDir}"
}
`;
        await Deno.writeTextFile(tempSchemaPath, schema);

        // Callback
        await callback({ databaseUrl, module, db, tempDir, generatedClientDir });
    });
}

/**
 * Create databases for a module.
 */
async function createDatabases(client: PostgresClient, db: ModuleDatabase) {
    // Create database
    const existsQuery = await client.queryObject<{ exists: boolean }>`SELECT EXISTS (SELECT FROM pg_database WHERE datname = ${db.name})`;
    if (!existsQuery.rows[0].exists) {
        await client.queryObject`CREATE DATABASE ${assertValidString(db.name)}`;
    }
}