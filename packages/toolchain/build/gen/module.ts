import {
	genActorCaseConversionMapPath,
	genActorTypedefPath,
	genRuntimeActorDriverPath,
	hasUserConfigSchema,
	Module,
	moduleHelperGen,
	Project,
} from "../../project/mod.ts";
import { GeneratedCodeBuilder } from "./mod.ts";
import {
	DRIZZLE_ORM_REEXPORT,
	genDependencyCaseConversionMapPath,
	genDependencyTypedefPath,
	genModulePublicExternal,
	genRuntimeModPath,
	projectGenPath,
	RUNTIME_CONFIG_PATH,
} from "../../project/project.ts";
import { camelify } from "../../../case_conversion/mod.ts";
import { BuildOpts } from "../mod.ts";

export async function compileModuleHelper(
	project: Project,
	module: Module,
	opts: BuildOpts,
) {
	const helper = new GeneratedCodeBuilder(moduleHelperGen(project, module), 3);

	const runtimePath = helper.relative(genRuntimeModPath(project));
	const reexportPath = helper.relative(
		projectGenPath(project, "runtime", "packages", "runtime", "export_to_module.ts"),
	);
	const dependencyCaseConversionMapPath = helper.relative(genDependencyCaseConversionMapPath(project));
	const actorCaseConversionMapPath = helper.relative(genActorCaseConversionMapPath(project));
	const runtimeConfigPath = helper.relative(projectGenPath(project, RUNTIME_CONFIG_PATH));

	// Import block
	const importBlock = helper.chunk.withNewlinesPerChunk(1)
		.append`
			import {
				ModuleContextParams as ModuleContextParamsInner,
				ModuleContext as ModuleContextInner,
				TestContext as TestContextInner,
				ScriptContext as ScriptContextInner,
				ActorContext as ActorContextInner,
				RouteContext as RouteContextInner,
				Runtime,
			} from "${runtimePath}";
			import config from "${runtimeConfigPath}";
			import { dependencyCaseConversionMap } from "${dependencyCaseConversionMapPath}";
			import { actorCaseConversionMap } from "${actorCaseConversionMapPath}";
			import { ActorDriver } from ${JSON.stringify(genRuntimeActorDriverPath(project, opts.runtime))};
			export * from ${JSON.stringify(reexportPath)};
		`;

	// Gen blocks
	const { userConfigType } = await genUserConfig(project, module, helper);
	genPublic(project, module, helper);
	genDependencies(project, module, helper);
	genActors(project, module, helper);
	genModule(project, module, helper, importBlock, userConfigType);
	genTest(project, module, helper);
	genScript(project, module, helper);
	genRoute(project, module, helper);
	genActor(project, module, helper);

	// Write source
	await helper.write();
}

async function genUserConfig(
	_project: Project,
	module: Module,
	helper: GeneratedCodeBuilder,
): Promise<{ userConfigType: string }> {
	let userConfigType = "Record<string, never>";
	if (await hasUserConfigSchema(module)) {
		userConfigType = "UserConfig";
		helper.chunk.append`import { Config as UserConfig } from "./config.ts";`;
	}
	return { userConfigType };
}

function genPublic(project: Project, module: Module, helper: GeneratedCodeBuilder) {
	const publicExternalPath = helper.relative(genModulePublicExternal(project, module));
	helper.append`
		export * as Module from ${JSON.stringify(publicExternalPath)};
	`;
}

function genDependencies(
	project: Project,
	module: Module,
	helper: GeneratedCodeBuilder,
) {
	const typedefPath = genDependencyTypedefPath(project);

	helper.append`
		import type {
			DependenciesSnake as DependenciesSnakeFull,
			DependenciesCamel as DependenciesCamelFull,
		} from "${typedefPath}";
	`;

	const dependencyTypedefSnake = helper.chunk.withNewlinesPerChunk(1);
	const dependencyTypedefCamel = helper.chunk.withNewlinesPerChunk(1);

	const moduleNameSnake = module.name;
	const moduleNameCamel = camelify(module.name);

	for (const dependencyName of Object.keys(module.config.dependencies || {})) {
		const dependencyNameSnake = dependencyName;
		const dependencyNameCamel = camelify(dependencyName);

		dependencyTypedefSnake.append`
			${dependencyNameSnake}: DependenciesSnakeFull["${dependencyNameSnake}"];
		`;
		dependencyTypedefCamel.append`
			${dependencyNameCamel}: DependenciesCamelFull["${dependencyNameCamel}"];
		`;
	}

	dependencyTypedefSnake.prepend`${moduleNameSnake}: DependenciesSnakeFull["${moduleNameSnake}"];`;
	dependencyTypedefCamel.prepend`${moduleNameCamel}: DependenciesCamelFull["${moduleNameCamel}"];`;

	GeneratedCodeBuilder.wrap(
		"interface DependenciesSnake {",
		dependencyTypedefSnake,
		"}",
	);
	GeneratedCodeBuilder.wrap(
		"interface DependenciesCamel {",
		dependencyTypedefCamel,
		"}",
	);
}

function genActors(
	project: Project,
	module: Module,
	helper: GeneratedCodeBuilder,
) {
	const typedefPath = genActorTypedefPath(project);

	helper.append`
		import type {
			ActorsSnake as ActorsSnakeFull,
			ActorsCamel as ActorsCamelFull,
		} from "${typedefPath}";
	`;

	const moduleNameSnake = module.name;
	const moduleNameCamel = camelify(module.name);

	helper.append`
    type ActorsSnake = ActorsSnakeFull["${moduleNameSnake}"];
    type ActorsCamel = ActorsCamelFull["${moduleNameCamel}"];
  `;
}

function genModule(
	project: Project,
	module: Module,
	helper: GeneratedCodeBuilder,
	importBlock: GeneratedCodeBuilder,
	userConfigType: string,
) {
	// Database
	if (module.db) {
		helper.append`
    export * as Query from ${JSON.stringify(projectGenPath(project, DRIZZLE_ORM_REEXPORT))};
    export * as Database from "./db/schema.ts";
    `;
		helper.append`
    import type * as databaseSchema from "./db/schema.ts"
    type ModuleDatabaseSchema = typeof databaseSchema;
    `;
	}

	// Export block
	helper.chunk.withNewlinesPerChunk(2)
		.append`
      interface ModuleContextParams extends ModuleContextParamsInner {
        dependenciesSnake: DependenciesSnake;
        dependenciesCamel: DependenciesCamel;
        actorsSnake: ActorsSnake;
        actorsCamel: ActorsCamel;
        userConfig: ${userConfigType};
        databaseSchema: ${module.db ? "ModuleDatabaseSchema" : "undefined"};
      }
    `
		.append`
			export type ModuleContext = ModuleContextInner<ModuleContextParams>;
		`;
}

function genTest(
	_project: Project,
	module: Module,
	helper: GeneratedCodeBuilder,
) {
	// Export block
	helper.chunk.withNewlinesPerChunk(1)
		.newline()
		.append`
			export type TestContext = TestContextInner<ModuleContextParams>;
		`;

	// Test Block
	helper.chunk.withNewlinesPerChunk(2)
		.append`export type TestFn = (ctx: TestContext) => Promise<void>;`
		.append`
			export function test(name: string, fn: TestFn) {
				Runtime.test(
					config,
					new ActorDriver(Deno.env, config, dependencyCaseConversionMap, actorCaseConversionMap),
					"${module.name}",
					name,
					fn,
					dependencyCaseConversionMap,
					actorCaseConversionMap,
				);
			}
		`;
}

function genScript(
	_project: Project,
	_module: Module,
	helper: GeneratedCodeBuilder,
) {
	// Export block
	helper.chunk.withNewlinesPerChunk(1)
		.newline()
		.append`
			export type ScriptContext = ScriptContextInner<ModuleContextParams>;
		`;
}

function genActor(
	_project: Project,
	_module: Module,
	helper: GeneratedCodeBuilder,
) {
	// Export block
	helper.chunk.withNewlinesPerChunk(1)
		.newline()
		.append`
			export type ActorContext = ActorContextInner<ModuleContextParams>;
		`;
}

function genRoute(
	_project: Project,
	_module: Module,
	helper: GeneratedCodeBuilder,
) {
	// Export block
	helper.chunk.withNewlinesPerChunk(1)
		.newline()
		.append`
			export type RouteContext = RouteContextInner<ModuleContextParams>;

			export type RouteRequest = Request;
			export const RouteRequest = Request;

			export type RouteResponse = Response;
			export const RouteResponse = Response;
		`;
}
