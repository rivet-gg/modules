import { Context } from "./context.ts";
import { Postgres, PostgresWrapped } from './postgres.ts';
import { serverHandler } from './server.ts';
import { Trace, appendTraceEntry, newTrace } from './trace.ts';
import { Ajv } from './deps.ts';

interface Config {
    modules: Record<string, Module>;
}

interface Module {
    scripts: Record<string, Script>;
}

type ScriptHandler<Req, Res> = (ctx: Context, req: Req) => Promise<Res>;

interface Script {
    handler: ScriptHandler<any, any>;
    requestSchema: any;
    responseSchema: any;
}

export class Runtime {
    public postgres: Postgres;

    private ajv= new Ajv.default();

    public constructor(public config: Config) {
        this.postgres = new Postgres();
    }

    public async call(parentTrace: Trace, moduleName: string, scriptName: string, req: unknown): Promise<unknown> {
        // Build trace
        let trace = appendTraceEntry(parentTrace, {
            script: { module: moduleName, script: scriptName }
        });

        // Build Postgres
        let postgres = new PostgresWrapped(this.postgres, moduleName);

        // Build context
        const ctx = new Context(this, trace, postgres);

        try {
            // Lookup module
            let module = this.config.modules[moduleName];
            if (!module) throw new Error(`Module not found: ${moduleName}`);

            // Lookup script
            let script = module.scripts[scriptName];
            if (!script) throw new Error(`Script not found: ${scriptName}`);

            // Compile schemas
            let validateRequest = this.ajv.compile(script.requestSchema);
            let validateResponse = this.ajv.compile(script.responseSchema);

            // Validate request
            if (!validateRequest(req)) throw new Error(`Invalid request: ${JSON.stringify(validateRequest.errors)}`);

            // Execute script
            let res = await script.handler(ctx, req);

            // Validate response
            if (!validateResponse(res)) throw new Error(`Invalid response: ${JSON.stringify(validateResponse.errors)}`);

            return res;
        } catch (err) {
            throw new Error(`Failed to execute script: ${err.message}`)
        }
    }

    public async serve() {
        const port = parseInt(Deno.env.get("PORT") ?? "8080");
        console.log(`Serving on port ${port}`);
        Deno.serve({ port }, serverHandler(this));
    }

    public async test(module: string, name: string, fn: (ctx: Context) => Promise<void>) {
        Deno.test(name, async () => {
            // Create trace
            const trace = newTrace({
                test: { module, name }
            });

            // Build Postgres
            const postgres = new PostgresWrapped(this.postgres, module);

            // Build context
            const ctx = new Context(this, trace, postgres);

            // Run test
            await fn(ctx);
        });
    }
}
