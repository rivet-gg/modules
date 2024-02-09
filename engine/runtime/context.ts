import { Runtime } from "./runtime.ts";
import { Client } from "postgres/mod.ts";
import { Trace } from "./trace.ts";
import { PostgresWrapped } from "./postgres.ts";

export class Context {
    public constructor(
        private runtime: Runtime,
        public readonly trace: Trace,
        public readonly postgres: PostgresWrapped,
    ) {}
}

