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
        let configRaw = await fs.readFile(path.join(modulePath, 'module.yaml'), 'utf8');
        let config = yaml.load(configRaw) as ModuleConfig;

        // Validate config
        let moduleConfigSchema = ajv.getSchema("#/definitions/ModuleConfig");
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

