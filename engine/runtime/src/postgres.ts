import * as postgres from "https://deno.land/x/postgres@v0.17.1/mod.ts";

const POOL_SIZE = 32;

type PostgresRunScope<T> = (conn: postgres.QueryClient) => Promise<T>;

/** Manages Postgres connections. */
export class Postgres {
    private databaseUrl: string; 
    public pools = new Map<string, postgres.Pool>();

    public constructor() {
        this.databaseUrl = Deno.env.get("DATABASE_URL") ?? "postgres://postgres:password@localhost:5432/postgres";
    }

    private getOrCreatePool(database: string): postgres.Pool {
        if (this.pools.has(database)) {
            return this.pools.get(database)!;
        } else {
            // Build URL for this database
            let url = new URL(this.databaseUrl);
            url.pathname = "/module_" + database;

            // Create & insert pool
            let pool = new postgres.Pool(url.toString(), POOL_SIZE, true);
            this.pools.set(database, pool);
            return pool;
        }
    }

    public async run<T>(database: string, scope: PostgresRunScope<T>): Promise<T> {
        const connection = await this.getOrCreatePool(database).connect();
        try {
            return scope(connection);
        } finally {
            connection.release();
        }
    }
}

/** A wrapper around Postgres with a specified database. */
export class PostgresWrapped {
    public constructor(private postgres: Postgres, private database: string) {}

    public async run<T>(scope: PostgresRunScope<T>): Promise<T> {
        return await this.postgres.run<T>(this.database, scope);
    }
}

