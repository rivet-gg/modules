import { BuildState, buildStep } from "../../build_state/mod.ts";
import { configPath, Module, Project } from "../../project/mod.ts";
import { compileModuleHelper } from "../gen/mod.ts";
import { compileModuleConfigSchema } from "../module_config_schema.ts";
import { planScriptBuild } from "./script.ts";
import { BuildOpts } from "../mod.ts";
import { hasUserConfigSchema, publicPath } from "../../project/module.ts";
import { getSourceFileDependencies } from "../schema/mod.ts";
import { assertExists } from "@std/assert";
import { resolve } from "@std/path";
import { compileDbSchemaHelper } from "../gen/db_schema.ts";

export async function planModuleParse(
	buildState: BuildState,
	project: Project,
	module: Module,
	opts: BuildOpts,
) {
	const configDeps = await hasUserConfigSchema(module) ? getSourceFileDependencies(configPath(module)) : [];
	buildStep(buildState, {
		id: `module.${module.name}.parse`,
		name: "Parse",
		description: `config.ts`,
		module,
		condition: {
			files: opts.strictSchemas ? [configPath(module), ...configDeps] : [],
			expressions: {
				strictSchemas: opts.strictSchemas,
			},
		},
		delayedStart: true,
		async build({ onStart }) {
			// Compile schema
			//
			// This mutates `module`
			await compileModuleConfigSchema(project, module, { strictSchemas: opts.strictSchemas, onStart });
		},
		async alreadyCached() {
			// Read schema from cache
			const schema = buildState.cache.persist.moduleConfigSchemas[module.name];
			assertExists(schema);
			module.userConfigSchema = schema;
		},
		async finally() {
			assertExists(module.userConfigSchema);

			// Populate cache with response
			buildState.cache.persist.moduleConfigSchemas[module.name] = module.userConfigSchema;
		},
	});
}

export async function planModuleBuild(
	buildState: BuildState,
	project: Project,
	module: Module,
	opts: BuildOpts,
) {
	buildStep(buildState, {
		id: `module.${module.name}.generate`,
		name: "Generate",
		description: `module.gen.ts`,
		module,
		condition: {
			files: [resolve(module.path, "module.json"), configPath(module), publicPath(module)],
			expressions: {
				db: !!module.db,
			},
		},
		async build() {
			await compileModuleHelper(project, module, opts);
		},
	});

	if (module.db) {
		buildStep(buildState, {
			id: `module.${module.name}.db_schema.generate`,
			name: "Generate",
			description: `schema.gen.ts`,
			module,
			condition: {
				files: [resolve(module.path, "module.json")],
				expressions: {
					db: !!module.db,
				},
			},
			async build() {
				await compileDbSchemaHelper(project, module, {});
			},
		});
	}

	for (const script of module.scripts.values()) {
		await planScriptBuild(buildState, project, module, script, opts);
	}
}
