import { IndexedModuleConfig, ProjectConfig, ProjectMeta } from "./types";

export function configHasModule(config: ProjectConfig, registry: string, module: string): boolean {
    return !!config.modules[module] ||
        Object.values(config.modules).find((m) => m.registry === registry && m.module === module);
}

/**
 * Add a module to the project and resolve its dependencies, modifies the project object in place
 */
export function addModule(
    meta: ProjectMeta,
    config: ProjectConfig,
    { registry, name, alias, force = true }: { registry: string; name: string; alias?: string; force?: boolean },
) {
    const moduleDef = meta.registries[registry].modules[name];

    if (!moduleDef) {
        throw new Error(`Module ${name} not found in registry ${registry}`);
    }

    // add dependecies
    const dependecies = Object.keys(moduleDef.dependencies || {})
        // filter out dependencies that are already in the project
        .filter((dep) => !configHasModule(meta.config, registry, dep));

    for (const name of dependecies) {
        addModule(meta, config, { name, registry, force: false });
    }

    appendModule(config.modules, { name, module: moduleDef, registry, alias, force });
}

/**
 * Append a module to the project, modifies the modules object in place
 */
function appendModule(
    modules: ProjectConfig["modules"],
    { name: moduleName, module, registry, alias, force }: {
        name: string;
        module: IndexedModuleConfig;
        registry: string;
        alias?: string;
        force?: boolean;
    },
) {
    let name = moduleName;

    if (force) {
        // if the module is already in the project, add a suffix
        if (modules[name]) {
            name = `${name}_${Date.now()}`;
        }
        if (alias) {
            name = alias;
        }
    }

    if (modules[name]) {
        return;
    }

    modules[name] = {};

    if (name !== moduleName) {
        modules[name].module = moduleName;
    }

    if (registry !== "default") {
        modules[name].registry = registry;
    }

    if (module.defaultConfig) {
        modules[name].config = module.defaultConfig;
    }
}
