import * as path from "https://deno.land/std/path/mod.ts";
import { parse } from "https://deno.land/std/yaml/mod.ts";
import { Ajv, glob, tjs } from './deps.ts';

// TODO: Clean this up
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let moduleConfigAjv = new Ajv({ schemas: [generateModuleConfigJsonSchema()] });

export class Registry {
    public static async load(rootPath: string): Promise<Registry> {
        console.log('Loading registry', rootPath);

        let modPaths = await glob("modules/*/module.yaml", { cwd: rootPath });
        let modules = {};
        for (let mod of modPaths) {
            let modName = path.basename(path.dirname(mod));
            modules[modName] = await Module.load(path.join(rootPath, path.dirname(mod)), modName);
        }
        return new Registry(rootPath, modules);
    }

    private constructor(public path: string, public modules: { [name: string]: Module }) {}
}

export interface ModuleConfig {
    metadata: ModuleMetadata;
    scripts: { [name: string]: ScriptConfig };
}


export interface ModuleMetadata {
    status: 'preview' | 'beta' | 'stable' | 'deprecated';
    description: string;

    /**
    * The GitHub handle of the authors of the module.
    */
    authors: string[];
}

export interface ScriptConfig {
    
}

export class Module {
    public static async load(modulePath: string, name: string): Promise<Module> {
        console.log('Loading module', modulePath);

        // Read config
        let configRaw = await Deno.readTextFile(path.join(modulePath, 'module.yaml'), 'utf8');
        let config = parse(configRaw) as ModuleConfig;

        // Validate config
        let moduleConfigSchema = moduleConfigAjv.getSchema("#/definitions/ModuleConfig");
        if (!moduleConfigSchema) throw new Error("Failed to get module config schema");
        if (!moduleConfigSchema(config)) {
            throw new Error(`Invalid module config: ${JSON.stringify(moduleConfigSchema.errors)}`);
        }

        // Read scripts
        let scripts = {};
        for (let scriptName in config.scripts) {
            let scriptPath = path.resolve(modulePath, 'scripts', scriptName);
            scripts[scriptName] = new Script(scriptPath, scriptName, config.scripts[scriptName]);
        }

        return new Module(modulePath, name, config, scripts);
    }

    private constructor(public path: string, public name: string, public config: ModuleConfig, public scripts: { [name: string]: Script }) {}
}

export class Script {
    public constructor(public path: string, public name: string, public config: ScriptConfig) {}
}

function generateModuleConfigJsonSchema(): tjs.Definition {
    console.log("Generating registry.ts schema");

    let schemaFiles = [__filename];

    const program = tjs.getProgramFromFiles(schemaFiles, {
        target: "es2015",
        esModuleInterop: true,
        allowImportingTsExtensions: true,
    });

    const schema = tjs.generateSchema(program, "ModuleConfig", {
        topRef: true,
        required: true,
        strictNullChecks: true,
        noExtraProps: true,
        esModuleInterop: true,

        // TODO: Is this needed?
        include: schemaFiles,

        // TODO: Figure out how to work without this? Maybe we manually validate the request type exists?
        ignoreErrors: true,
    });
    if (schema == null) throw new Error("Failed to generate schema");

    return schema;
}
