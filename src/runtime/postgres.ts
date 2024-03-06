import { QueryClient, Transaction } from "./deps.ts";
import { Module } from "./runtime.ts";

const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/postgres";

type PostgresRunScope<T> = (conn: QueryClient) => Promise<T>;
type PostgresTransactionScope<T> = (conn: Transaction) => Promise<T>;

export interface PrismaClientDummy {
	$disconnect(): Promise<void>;
}

export interface Pool {
	prisma: PrismaClientDummy;
	pgPool?: any;
}

/** Manages Postgres connections. */
export class Postgres {
	private isShutDown = false;

	public pools = new Map<string, Pool>();

	public async shutdown() {
		this.isShutDown = true;
		for (const pool of this.pools.values()) {
			await pool.prisma.$disconnect();
			if (pool.pgPool) await pool.pgPool.end();
		}
	}

	public getOrCreatePool(moduleName: string, module: Module): Pool | undefined {
		if (!module.db) return undefined;
		if (this.isShutDown) throw new Error("Postgres is shutting down");

		if (this.pools.has(module.db.name)) {
			return this.pools.get(module.db.name)!;
		} else {
			const moduleDbUrl = Deno.env.get(`DATABASE_URL_${moduleName}__${module.db.name}`);
			let url;
			
			if(moduleDbUrl) {
				url = new URL(moduleDbUrl);
			} else {
				// Build URL for this database
				url = new URL(Deno.env.get("DATABASE_URL") ?? DEFAULT_DATABASE_URL);
				url.pathname = "/" + module.db.name;
			}

			// Create & insert pool
			const output = module.db.createPrisma(url.toString());
			const pool = {
				prisma: output.prisma,
				pgPool: output.pgPool,
			} as Pool;
			this.pools.set(module.db.name, pool);
			return pool;
		}
	}
}

/** Dummy type to represent places where we reference a specific database. */
export type PostgresWrapped<T> = T;
