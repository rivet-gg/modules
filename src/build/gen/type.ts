import { genDependencyCaseConversionMapPath, genDependencyTypedefPath, Project } from "../../project/mod.ts";
import { GeneratedCodeBuilder } from "./mod.ts";
import { camelify, pascalify } from "../../types/case_conversions.ts";
import { compilePublicUtilsHelpers } from "./public_utils.ts";

export async function compileTypeHelpers(project: Project) {
	const typedefPath = genDependencyTypedefPath(project);
	const caseConversionPath = genDependencyCaseConversionMapPath(project);
	const dependencyTypedef = new GeneratedCodeBuilder(typedefPath, 4);
	const dependencyCaseConversionMap = new GeneratedCodeBuilder(caseConversionPath, 4);

	dependencyTypedef.append`
		export type RequestOf<T> = T extends { request: any } ? T["request"] : never;
		export type ResponseOf<T> = T extends { response: any } ? T["response"] : never;

		export type DependencyCallFn<ThisType> = <M extends keyof DependenciesSnake & string, S extends keyof DependenciesSnake[M] & string>(
			this: ThisType,
			module: M,
			script: S,
			req: RequestOf<DependenciesSnake[M][S]>,
		) => Promise<ResponseOf<DependenciesSnake[M][S]>>;
	`;

	const moduleTypes = dependencyTypedef.chunk.withNewlinesPerChunk(4);

	const moduleSnakeEntries = dependencyTypedef.chunk.withNewlinesPerChunk(1);
	const moduleCamelEntries = dependencyTypedef.chunk.withNewlinesPerChunk(1);

	for (const module of project.modules.values()) {
		moduleTypes.append`
			//
			// Types for ${module.name}
			//
		`;

		const scriptImports = moduleTypes.chunk.withNewlinesPerChunk(2);
		const scriptSnakeEntries = moduleTypes.chunk.withNewlinesPerChunk(1);
		const scriptCamelEntries = moduleTypes.chunk.withNewlinesPerChunk(1);
		const moduleCaseConversionMap = dependencyCaseConversionMap.chunk.withNewlinesPerChunk(1);

		for (const script of module.scripts.values()) {
			const scriptId = `${pascalify(module.name)}_${pascalify(script.name)}`;

			const requestTypeName = `${scriptId}_Req`;
			const responseTypeName = `${scriptId}_Res`;

			const importPath = dependencyTypedef.relative(
				module.path,
				"scripts",
				`${script.name}.ts`,
			);

			scriptImports.append`
				// modules.${camelify(module.name)}.${camelify(script.name)}
				import type {
					Request as ${requestTypeName},
					Response as ${responseTypeName},
				} from ${JSON.stringify(importPath)};
			`;

			scriptSnakeEntries.append`
				${script.name}: {
					request: ${requestTypeName};
					response: ${responseTypeName};
				};
			`;
			scriptCamelEntries.append`
				${camelify(script.name)}: {
					request: ${requestTypeName};
					response: ${responseTypeName};
				};
			`;

			moduleCaseConversionMap.append`
				${camelify(script.name)}: ["${module.name}", "${script.name}"],
			`;
		}

		const moduleInterfaceNameSnake = `${pascalify(module.name)}_Module`;
		const moduleInterfaceNameCamel = `${pascalify(module.name)}_ModuleCamel`;

		GeneratedCodeBuilder.wrap(
			`interface ${moduleInterfaceNameSnake} {`,
			scriptSnakeEntries,
			"}",
		);
		GeneratedCodeBuilder.wrap(
			`interface ${moduleInterfaceNameCamel} {`,
			scriptCamelEntries,
			"}",
		);

		moduleSnakeEntries.append`
			${module.name}: ${moduleInterfaceNameSnake};
		`;
		moduleCamelEntries.append`
			${camelify(module.name)}: ${moduleInterfaceNameCamel};
		`;

		// Wrap entries into an object
		GeneratedCodeBuilder.wrap(
			`${camelify(module.name)}: {`,
			moduleCaseConversionMap,
			"},",
		);
	}

	GeneratedCodeBuilder.wrap(
		"interface DependenciesSnake {",
		moduleSnakeEntries,
		"}",
	);
	GeneratedCodeBuilder.wrap(
		"interface DependenciesCamel {",
		moduleCamelEntries,
		"}",
	);

	// Wrap entries into a const object
	GeneratedCodeBuilder.wrap(
		`export const dependencyCaseConversionMap = {`,
		dependencyCaseConversionMap,
		`} as const;`,
	);

	await dependencyTypedef.write();
	await dependencyCaseConversionMap.write();

	await compilePublicUtilsHelpers(project);
}
