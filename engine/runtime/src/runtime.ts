import { Context } from "./context.ts";

interface Config {
    modules: { [name: string]: Module };
    schema: any;
}

interface Module {
    scripts: { [name: string]: Script };
}

type ScriptHandler<Req, Res> = (ctx: Context, req: Req) => Promise<Res>;

interface Script {
    handler: ScriptHandler<unknown, unknown>;
}

export class Runtime {
    public constructor(public config: Config) {}

    public async call(moduleName: string, scriptName: string, req: unknown): Promise<unknown> {
        // TODO: Validate request schema

        const ctx = new Context();

        let module = this.config.modules[moduleName];
        if (!module) throw new Error(`Module not found: ${moduleName}`);

        let script = module.scripts[scriptName];
        if (!script) throw new Error(`Script not found: ${scriptName}`);

        try {
            return await script.handler(ctx, req);
        } catch (err) {
            throw new Error(`Failed to execute script: ${err.message}`)
        }
    }
}
