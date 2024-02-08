import { Context } from "./context.ts";
import { Postgres } from './postgres.ts';
import { serverHandler } from './server.ts';
import { Ajv } from './deps.ts';

interface Config {
    modules: { [name: string]: Module };
}

interface Module {
    scripts: { [name: string]: Script };
}

type ScriptHandler<Req, Res> = (ctx: Context, req: Req) => Promise<Res>;

interface Script {
    handler: ScriptHandler<unknown, unknown>;
    requestSchema: any;
    responseSchema: any;
}

export class Runtime {
    public postgres: Postgres;

    private ajv: Ajv = new Ajv();

    public constructor(public config: Config) {
        this.postgres = new Postgres();
    }

    public async call(moduleName: string, scriptName: string, req: unknown): Promise<unknown> {
        // Build context
        const ctx = new Context(this);

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
}
