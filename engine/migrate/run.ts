// TODO: Pin this version
import * as path from "std/path/mod.ts";
import { Module, Registry, loadRegistry } from "../registry/mod.ts";
import { assertValidString } from "./validate.ts";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from 'drizzle-orm/node-postgres/migrator';
// import { Client as postgres.Client } from "pg";
import postgres from "pg";

async function main() {
	// Load registry
	const registry = await loadRegistry();

	// Setup database
	const databaseUrl = Deno.env.get("DATABASE_URL") ??
		"postgres://postgres:password@localhost:5432/postgres";
	await createDatabases(registry, databaseUrl);

	// Run migrations
	for (const mod of registry.modules.values()) {
		await runModuleMigrations(mod, databaseUrl);
	}
}

/**
 * Create databases for a module in the directory.
 */
async function createDatabases(registry: Registry, databaseUrl: string) {
	const client = new postgres.Client({ connectionString: databaseUrl });
	await client.connect();

	try {
		for (const mod of registry.modules.values()) {
			if (!mod.db) continue;

			// Create database
			const existsQuery = await client.query(`SELECT EXISTS (SELECT FROM pg_database WHERE datname = $1)`, [mod.db.name]);
			if (!existsQuery.rows[0].exists) {
				await client.query(`CREATE DATABASE ${assertValidString(mod.db.name)}`);
			}
		}
	} catch (cause) {
		throw new Error("Failed to create databases", { cause });
	} finally {
		await client.end();
	}
}

async function runModuleMigrations(mod: Module, databaseUrl: string) {
	if (!mod.db) return;

	// Connect to database for this module
	const databaseUrlParsed = new URL(databaseUrl);
	databaseUrlParsed.pathname = `/${mod.db.name}`;

	const client = new postgres.Client(databaseUrlParsed.toString());
	await client.connect();
	try {
		const db = drizzle(client);
		await migrate(db, {
			migrationsFolder: path.join(mod.path, "db", "migrations"),
		})
	} catch (cause) {
		throw new Error(`Failed to run migrations for ${mod.db.name}`, { cause });
	} finally {
		await client.end();
	}
}

async function runMigration(
	client: postgres.Client,
	mod: Module,
	idx: number,
	name: string,
	source: string,
) {
	const transaction = client.createTransaction("migrate");
	await transaction.begin();
	try {
		// Check if migration already ran
		const result = await transaction.queryObject<
			{ name: string }
		>`SELECT name FROM _migrations WHERE idx = ${idx}`;

		// Validate the migration name hasn't changed
		if (result.rows.length > 0 && result.rows[0].name != name) {
			throw new Error(
				`Migration name mismatch at index ${idx}: ${
					result.rows[0].name
				} != ${name}`,
			);
		}

		if (result.rows.length === 0) {
			// Run migration

			console.log(`${mod.name}@${name}: Running`);
			await transaction.queryArray(source);
			await transaction
				.queryArray`INSERT INTO _migrations (idx, name) VALUES (${idx}, ${name})`;
			console.log(`${mod.name}@${name}: Complete`);
		} else {
			// Migration already ran

			console.log(`${mod.name}@${name}: Already ran`);
		}

		await transaction.commit();
	} catch (cause) {
		try {
			await transaction.rollback();
		} catch (cause) {
			console.warn("Failed to rollback transaction", cause);
		}
		throw new Error(`Failed to run migration ${mod.name}@${name}`, { cause });
	}
}

main();
