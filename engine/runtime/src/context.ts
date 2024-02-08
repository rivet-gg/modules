import { Runtime } from "./runtime.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.1/mod.ts";
import { Trace } from "./trace.ts";
import { Postgres } from "./postgres.ts";

export class Context {
    public get postgres(): Postgres {
        return this.runtime.postgres;
    }

    public constructor(
        private runtime: Runtime,
        public readonly trace: Trace
    ) {}
}

