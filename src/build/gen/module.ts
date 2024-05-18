import { Module, moduleGenPath, Project } from "../../project/mod.ts";
import { GeneratedCodeBuilder, getUserConfigImport } from "./mod.ts";
import { genRuntimeModPath } from "../../project/project.ts";

export async function compileModuleHelper(
	project: Project,
	module: Module,
) {
	const helper = new GeneratedCodeBuilder(moduleGenPath(project, module), 3);

	const runtimePath = helper.relative(genRuntimeModPath(project));
	const { userConfigImport, userConfigType } = await getUserConfigImport(module, "..");

	// Import block
	const importBlock = helper.chunk.withNewlinesPerChunk(1)
		.append`
			import { ModuleContext as ModuleContextInner } from "${runtimePath}";
			${userConfigImport}
		`
		.append`
			import type {
				DependenciesSnake as DependenciesSnakeTypeInner,
				DependenciesCamel as DependenciesCamelTypeInner,
			} from "./dependencies.d.ts";
		`;

	if (module.db) {
		importBlock.append`
			import prisma from "./prisma/esm.js";
			export { prisma };
			export const Prisma = prisma.Prisma;
		`;
	}

	// Export block
	helper.chunk.withNewlinesPerChunk(2)
		.append`export * as Module from "./public.ts";`
		.append`
			/**
			 * Empty Request/Response type.
			 * 
			 * This only exists because of some quirks of empty interfaces in
			 * typescript that can be read more about here:
			 * https://www.totaltypescript.com/the-empty-object-type-in-typescript
			 */
			export type Empty = Record<string, never>;
		`
		.append`
			export { RuntimeError } from "${runtimePath}";
			export type ModuleContext = ModuleContextInner<
				DependenciesSnakeTypeInner,
				DependenciesCamelTypeInner,
				${userConfigType},
				${module.db ? "prisma.PrismaClient" : "undefined"}
			>;
		`;

	// Write source
	await helper.write();
}
