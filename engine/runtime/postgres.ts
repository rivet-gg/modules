import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import postgres from "pg";

const POOL_SIZE = 32;

// type PostgresRunScope<T> = (conn: postgres.QueryClient) => Promise<T>;
// type PostgresTransactionScope<T> = (conn: postgres.Transaction) => Promise<T>;


export type DrizzleSchema = Record<string, unknown>;

type DrizzleInstance<TDrizzleSchema extends DrizzleSchema> = NodePgDatabase<TDrizzleSchema>;

interface PoolEntry<TDrizzleSchema extends DrizzleSchema> {
	pool: postgres.Pool;
	drizzle: DrizzleInstance<TDrizzleSchema>;
}

/** Manages Postgres connections. */
export class Postgres {
	private databaseUrl: string;
	public pools = new Map<string, PoolEntry<any>>();

	public constructor() {
		this.databaseUrl = Deno.env.get("DATABASE_URL") ??
			"postgres://postgres:password@localhost:5432/postgres";
	}

	public async shutdown() {
		for (const pool of this.pools.values()) {
			await pool.pool.end();
		}
	}

	public getOrCreatePool<TDrizzleSchema extends DrizzleSchema>(database: string, schema: TDrizzleSchema): PoolEntry<TDrizzleSchema> {
		if (this.pools.has(database)) {
			return this.pools.get(database)!;
		} else {
			// Build URL for this database
			const url = new URL(this.databaseUrl);
			url.pathname = "/module_" + database.toLowerCase().replace("-", "_");

			// Create & insert pool
			const pool = new postgres.Pool({
				connectionString: url.toString(),
				max: POOL_SIZE,
			});
			const drizzleInstance = drizzle(pool, { schema });
			this.pools.set(database, {
				pool,
				drizzle: drizzleInstance,
			});
			
			return pool;
		}
	}

	// public async run<T>(
	// 	database: string,
	// 	scope: PostgresRunScope<T>,
	// ): Promise<T> {
	// 	const connection = await this.getOrCreatePool(database).connect();
	// 	try {
	// 		return scope(connection);
	// 	} finally {
	// 		connection.release();
	// 	}
	// }
}

export type PostgresWrapped<TDrizzleSchema extends DrizzleSchema> = DrizzleInstance<TDrizzleSchema>;

/** A wrapper around Postgres with a specified database. */
// export class PostgresWrapped<TDrizzleSchema extends Record<string, unknown>> {
// 	public constructor(private postgres: Postgres, private database: string) {}

// 	public async run<T>(scope: PostgresRunScope<T>): Promise<T> {
// 		return await this.postgres.run<T>(this.database, scope);
// 	}

// 	public async transaction<T>(
// 		name: string,
// 		scope: PostgresTransactionScope<T>,
// 	): Promise<T> {
// 		return await this.run(async (conn) => {
// 			const transaction = conn.createTransaction(name);
// 			await transaction.begin();
// 			try {
// 				const result = await scope(transaction);
// 				await transaction.commit();
// 				return result;
// 			} catch (cause) {
// 				try {
// 					await transaction.rollback();
// 				} catch (cause) {
// 					console.warn("Failed to rollback transaction", cause);
// 				}
// 				throw new Error(`Failed to execute transaction: ${name}`, { cause });
// 			}
// 		});
// 	}
// }
