import * as postgres from "https://deno.land/x/postgres@v0.17.1/mod.ts";

type PostgresRunScope<T> = (conn: postgres.QueryClient) => Promise<T>;

export class Postgres {
    public pool: postgres.Pool;

    public constructor() {
        const databaseUrl = Deno.env.get("DATABASE_URL") ?? "postgres://postgres:password@localhost:5432/postgres"
        this.pool = new postgres.Pool(databaseUrl, 3, true);
    }

    public async run<T>(scope: PostgresRunScope<T>): Promise<T> {
        const connection = await this.pool.connect();
        try {
            return scope(connection);
        } finally {
            connection.release();
        }
    }
}

