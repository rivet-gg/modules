import { Module, Project, Script, scriptGenPath } from "../../project/mod.ts";
import { GeneratedCodeBuilder, getUserConfigImport } from "./mod.ts";
import { genRuntimeModPath } from "../../project/project.ts";

export async function compileScriptHelper(
	project: Project,
	module: Module,
	script: Script,
) {
	const helper = new GeneratedCodeBuilder(scriptGenPath(project, module, script), 3);

	const runtimePath = helper.relative(genRuntimeModPath(project));
	const { userConfigImport, userConfigType } = await getUserConfigImport(module, "../..");

	// Import block
	helper.chunk.withNewlinesPerChunk(1)
		.append`import * as module from "../mod.ts";`
		.append`
			import { ScriptContext as ScriptContextInner } from "${runtimePath}";
			${userConfigImport}
		`
		.append`
			import type {
				DependenciesSnake as DependenciesSnakeTypeInner,
				DependenciesCamel as DependenciesCamelTypeInner,
			} from "../dependencies.d.ts";
		`;

	// Export block
	helper.chunk.withNewlinesPerChunk(1)
		.append`export * from "../mod.ts";`
		.newline()
		.append`
			export type ScriptContext = ScriptContextInner<
				DependenciesSnakeTypeInner,
				DependenciesCamelTypeInner,
				${userConfigType},
				${module.db ? "module.prisma.PrismaClient" : "undefined"}
			>;
		`;

	// Write source
	await helper.write();
}
