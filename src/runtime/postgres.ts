import { Module } from "./runtime.ts";
import { Config } from "./mod.ts";
import { getDatabaseUrl } from "../utils/db.ts";

/**
 * Unknown driver type.
 */
export interface PgPoolDummy {
	end?: () => Promise<void>;
}

/**
 * We don't have access to the generated Prisma type, so we create an interface with only what we need to interact with.
 *
 * This will be converted to the full Prisma type when passed to the context.
 */
export interface PrismaClientDummy {
	$disconnect(): Promise<void>;
}

/** Manages Postgres connections. */
export class Postgres {
	private isShutDown = false;

	private pgPool?: PgPoolDummy;
	public prismaClients = new Map<string, PrismaClientDummy>();

	public async shutdown() {
		this.isShutDown = true;
		for (const client of this.prismaClients.values()) {
			await client.$disconnect();
		}
		if (this.pgPool?.end) await this.pgPool.end();
	}

	public getOrCreatePgPool(config: Config): PgPoolDummy {
		if (this.isShutDown) throw new Error("Postgres is shutting down");

		if (this.pgPool) {
			return this.pgPool;
		} else {
			const url = getDatabaseUrl();

			// Create & insert pool
			const output = config.db.createPgPool(url);
			this.pgPool = output;
			return output;
		}
	}

	public getOrCreatePrismaClient(config: Config, module: Module): PrismaClientDummy | undefined {
		if (!module.db) return undefined;
		if (this.isShutDown) throw new Error("Postgres is shutting down");

		if (this.prismaClients.has(module.db.schema)) {
			return this.prismaClients.get(module.db.schema)!;
		} else {
			// Create & insert pool
			const pool = this.getOrCreatePgPool(config);
			const client = module.db.createPrismaClient(pool, module.db.schema);
			this.prismaClients.set(module.db.schema, client);
			return client;
		}
	}
}

/** Dummy type to represent places where we reference a specific database. */
export type PostgresWrapped<T> = T;
