import { glob } from 'glob';
import path from 'path';
import { promises as fs } from 'fs';
import yaml from 'js-yaml';
import { schema } from '../dist/schema';
import Ajv from 'ajv';

let ajv = new Ajv({ schemas: [schema] });

export class Registry {
    public static async load(rootPath: string): Promise<Registry> {
        console.log('Loading registry', rootPath);

        let modPaths = await glob("modules/*/module.yaml", { cwd: rootPath });
        let modules: Module[] = [];
        for (let mod of modPaths) {
            modules.push(await Module.load(path.join(rootPath, path.dirname(mod))));
        }
        return new Registry(rootPath, modules);
    }

    private constructor(public path: string, public modules: Module[]) {}
}

export interface ModuleConfig {
    scripts: { [name: string]: ScriptConfig };
}

export interface ScriptConfig {
    
}

export class Module {
    public static async load(modulePath: string): Promise<Module> {
        console.log('Loading module', modulePath);

        // Read config
        let configRaw = await fs.readFile(path.join(modulePath, 'module.yaml'), 'utf8');
        let config = yaml.load(configRaw) as ModuleConfig;

        // Validate config
        let moduleConfigSchema = ajv.getSchema("#/definitions/ModuleConfig");
        if (!moduleConfigSchema) throw new Error("Failed to get module config schema");
        if (!moduleConfigSchema(config)) {
            throw new Error(`Invalid module config: ${JSON.stringify(moduleConfigSchema.errors)}`);
        }

        // Read scripts
        let scripts: Script[] = [];
        for (let fnName in config.scripts) {
            let scriptPath = path.resolve(modulePath, 'scripts', fnName);
            let script = new Script(scriptPath, fnName, config.scripts[fnName])
            scripts.push(script);
        }

        return new Module(modulePath, config);
    }

    private constructor(public path: string, public config: ModuleConfig) {}
}

export class Script {
    public static async load(scriptPath: string, name: string, config: ScriptConfig): Promise<Script> {
        return new Script(scriptPath, name, config);
    }

    constructor(public path: string, public name: string, public config: ScriptConfig) {}
}
