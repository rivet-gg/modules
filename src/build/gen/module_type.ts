import { genDependencyTypedefPath, Module, Project, typeGenPath } from "../../project/mod.ts";
import { GeneratedCodeBuilder } from "./mod.ts";
import { camelify } from "../../types/case_conversions.ts";
import { compileModulePublicUtilsHelper } from "./module_public_utils.ts";

export async function compileModuleTypeHelper(
	project: Project,
	module: Module,
) {
	const typeHelper = new GeneratedCodeBuilder(typeGenPath(project, module), 4);

	const typedefPath = genDependencyTypedefPath(project);

	typeHelper.append`
		import type {
			DependenciesSnake as DependenciesSnakeFull,
			DependenciesCamel as DependenciesCamelFull,
		} from "${typedefPath}";
	`;

	const dependencyTypedefSnake = typeHelper.chunk.withNewlinesPerChunk(1);
	const dependencyTypedefCamel = typeHelper.chunk.withNewlinesPerChunk(1);

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
		"export interface DependenciesSnake {",
		dependencyTypedefSnake,
		"}",
	);
	GeneratedCodeBuilder.wrap(
		"export interface DependenciesCamel {",
		dependencyTypedefCamel,
		"}",
	);

	await typeHelper.write();
	await compileModulePublicUtilsHelper(project, module);
}
