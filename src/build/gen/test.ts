import { genDependencyCaseConversionMapPath, Module, Project, testGenPath } from "../../project/mod.ts";
import { GeneratedCodeBuilder, getUserConfigImport } from "./mod.ts";
import { genRuntimeModPath } from "../../project/project.ts";

export async function compileTestHelper(
	project: Project,
	module: Module,
) {
	const helper = new GeneratedCodeBuilder(testGenPath(project, module), 3);

	const runtimePath = helper.relative(genRuntimeModPath(project));
	const dependencyCaseConversionMapPath = helper.relative(genDependencyCaseConversionMapPath(project));
	const runtimeConfigPath = helper.relative(project.path, "_gen", "runtime_config.ts");

	const { userConfigImport, userConfigType } = await getUserConfigImport(module, "..");

	// Import block
	helper.chunk.withNewlinesPerChunk(1)
		.append`
			import * as module from "./mod.ts";
			import { Runtime, TestContext as TestContextInner } from "${runtimePath}";
			import config from "${runtimeConfigPath}";
		`
		.append`
			import type {
				DependenciesSnake as DependenciesSnakeTypeInner,
				DependenciesCamel as DependenciesCamelTypeInner,
			} from "./dependencies.d.ts";
			import { dependencyCaseConversionMap } from "${dependencyCaseConversionMapPath}";
		`
		.append`${userConfigImport}`;

	// Export block
	helper.chunk.withNewlinesPerChunk(1)
		.append`export * from "./mod.ts";`
		.newline()
		.append`
			export type TestContext = TestContextInner<
				DependenciesSnakeTypeInner,
				DependenciesCamelTypeInner,
				${userConfigType},
				${module.db ? "module.prisma.PrismaClient" : "undefined"}
			>;
		`;

	// Test Block
	helper.chunk.withNewlinesPerChunk(2)
		.append`export type TestFn = (ctx: TestContext) => Promise<void>;`
		.append`
			export function test(name: string, fn: TestFn) {
				Runtime.test(config, "${module.name}", name, fn, dependencyCaseConversionMap);
			}
		`;

	// Write source
	await helper.write();
}
