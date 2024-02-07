import { Runtime } from "./runtime.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.1/mod.ts";

export class Context {
    public readonly postgres: Postgres;

    public constructor(private runtime: Runtime) {
        this.postgres = new Postgres(runtime);
    }
}

type PostgresRunScope<T> = (conn: postgres.QueryClient) => Promise<T>;

export class Postgres {
    public constructor(private runtime: Runtime) {}

    public async run<T>(scope: PostgresRunScope<T>): Promise<T> {
        const connection = await this.runtime.pg.connect();
        try {
            return scope(connection);
        } finally {
            connection.release();
        }
    }
}

