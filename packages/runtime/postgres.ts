import { Module } from "./runtime.ts";
import { Config } from "./mod.ts";
import { Environment } from "./environment.ts";

// See also packages/toolchain/drizzle_consts.ts (DRIZZLE_ORM_PACKAGE)
//
// Just types since all actual Postgres Drizzle code will be imported in
// entrypoint.ts in order to support multiple drivers.
import type { drizzle, NodePgDatabase } from "npm:drizzle-orm@0.33.0/node-postgres";
import { Logger } from "npm:drizzle-orm@0.33.0/logger";
import { log } from "./logger.ts";
import { LogEntry } from "./logger.ts";
import { assertExists } from "./deps.ts";

export { drizzle };

export function getDatabaseUrl(env: Environment): URL {
	const databaseUrl = env.get("DATABASE_URL");
	assertExists(databaseUrl, "`DATABASE_URL` environment variable missing");
	return new URL(databaseUrl);
}

/**
 * Unknown driver type.
 */
export interface PgPoolDummy {
	end?: () => Promise<void>;
}

// TODO:
/**
 * This type represents the module exported from `db/schema.ts`.
 *
 * Required by NodePgDatabase.
 */
export type DatabaseSchema = Record<string, unknown>;

/**
 * Represents a generic Drizzle client.
 */
export type Database<T extends DatabaseSchema> = NodePgDatabase<T>;

/** Manages Postgres connections. */
export class Postgres {
	private isShutDown = false;

	private pgPool?: PgPoolDummy;
	public drizzleClients = new Map<string, Database<any>>();

	public async shutdown() {
		this.isShutDown = true;
		if (this.pgPool?.end) await this.pgPool.end();
	}

	public getOrCreatePgPool(env: Environment, config: Config): PgPoolDummy {
		if (this.isShutDown) throw new Error("Postgres is shutting down");

		if (this.pgPool) {
			return this.pgPool;
		} else {
			const url = getDatabaseUrl(env);

			// Create & insert pool
			const output = config.db.createPgPool(url);
			this.pgPool = output;
			return output;
		}
	}

	public getOrCreateDrizzleClient<T extends DatabaseSchema>(
		env: Environment,
		config: Config,
		module: Module,
	): Database<T> {
		if (!module.db) {
			throw new Error("Cannot create Drizzle client for module without database");
		}

		if (this.isShutDown) throw new Error("Postgres is shutting down");

		if (this.drizzleClients.has(module.db.schemaName)) {
			return this.drizzleClients.get(module.db.schemaName) as Database<T>;
		} else {
			// Create logger

			// Create & insert pool
			const pool = this.getOrCreatePgPool(env, config);
			const drizzleInstance = config.db.drizzleFn(pool, {
				schema: module.db.drizzleSchema,
				logger: env.get("_OPENGB_LOG_SQL_QUERIES") == "1" ? new DrizzleLogger() : undefined,
			});
			this.drizzleClients.set(module.db.schemaName, drizzleInstance);
			return drizzleInstance as Database<T>;
		}
	}
}

class DrizzleLogger implements Logger {
	logQuery(query: string, params: unknown[]): void {
		const logParams = params.map((x, i) => [`params.${i}`, JSON.stringify(x)] as LogEntry);
		log("info", "sql query", ["query", query], ...logParams);
	}
}
