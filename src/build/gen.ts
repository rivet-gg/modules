import { dirname, join, relative } from "../deps.ts";
import {
	Module,
	moduleGenPath,
	Project,
	Script,
	scriptGenPath,
	testGenPath,
	typeGenPath,
} from "../project/mod.ts";
import { genRuntimeModPath } from "../project/project.ts";
import { autoGenHeader } from "./misc.ts";

export async function compileModuleHelper(
	project: Project,
	module: Module,
) {
	const runtimePath = genRuntimeModPath(project);

	// Generate source
	const dbImports = [
		'import prisma from "./prisma/esm.js";',
		"export { prisma };",
		"export const Prisma = prisma.Prisma;",
	];
	const source = [
		autoGenHeader(),
		"",
		`import { ModuleContext as ModuleContextInner } from "${runtimePath}";`,
		`import { Registry as RegistryTypeInner } from "./registry.d.ts";`,
		"",
		...(module.db ? dbImports : []),
		"",
		`export { RuntimeError } from "${runtimePath}";`,
		`export type ModuleContext = ModuleContextInner<RegistryTypeInner, ${
			module.db ? "prisma.PrismaClient" : "undefined"
		}>;`,
		"",
	].join("\n");

	// Write source
	const helperPath = moduleGenPath(project, module);
	await Deno.mkdir(dirname(helperPath), { recursive: true });
	await Deno.writeTextFile(helperPath, source);
}

export async function compileTestHelper(
	project: Project,
	module: Module,
) {
	const runtimePath = genRuntimeModPath(project);

	const source = [
		autoGenHeader(),
		'import * as module from "./mod.ts";',
		`import { Runtime, TestContext as TestContextInner } from "${runtimePath}";`,
		`import { Registry as RegistryTypeInner } from "./registry.d.ts";`,
		`import config from "${project.path}/_gen/runtime_config.ts";`,
		"",
		'export * from "./mod.ts";',
		"",
		`export type TestContext = TestContextInner<RegistryTypeInner, ${
			module.db ? "module.prisma.PrismaClient" : "undefined"
		}>;`,
		"",
		"export type TestFn = (ctx: TestContext) => Promise<void>;",
		"",
		"export function test(name: string, fn: TestFn) {",
		`	Runtime.test(config, "${module.name}", name, fn);`,
		"}",
		"",
	].join("\n");

	// Write source
	const helperPath = testGenPath(project, module);
	await Deno.mkdir(dirname(helperPath), { recursive: true });
	await Deno.writeTextFile(helperPath, source);
}

export async function compileScriptHelper(
	project: Project,
	module: Module,
	script: Script,
) {
	const runtimePath = genRuntimeModPath(project);

	const source = [
		autoGenHeader(),
		'import * as module from "../mod.ts";',
		`import { ScriptContext as ScriptContextInner } from "${runtimePath}";`,
		`import { Registry as RegistryTypeInner } from "../registry.d.ts";`,
		"",
		module.db ? 'import { PrismaClient } from "../prisma/index.d.ts";' : "", // NOTE: This is not used anywhere
		"",
		'export * from "../mod.ts";',
		"",
		`export type ScriptContext = ScriptContextInner<RegistryTypeInner, ${
			module.db ? "module.prisma.PrismaClient" : "undefined"
		}>;`,
		"",
	].join("\n");

	// Write source
	const helperPath = scriptGenPath(project, module, script);
	await Deno.mkdir(dirname(helperPath), { recursive: true });
	await Deno.writeTextFile(helperPath, source);
}

export async function compileTypeHelpers(project: Project) {
	const typedefPath = join(
		project.path,
		"_gen",
		"registry.d.ts",
	);

	const modules: string[] = [];

	for (const module of project.modules.values()) {
		const scripts: string[] = [];

		const moduleInterfaceName = `${module.name}Module`;
		for (const script of module.scripts.values()) {
			const scriptId = `${module.name}$$${script.name}`;

			const requestTypeName = `${scriptId}Req`;
			const responseTypeName = `${scriptId}Res`;

			const importPath = join(
				module.path,
				"scripts",
				`${script.name}.ts`,
			);

			const pathComment = `// ${module.name}/${script.name}`;
			const importLine =
				`import type { Request as ${requestTypeName}, Response as ${responseTypeName} } from ${
					JSON.stringify(importPath)
				};`;

			const interfaceDef = [
				`interface ${moduleInterfaceName} {`,
				`\t${script.name}: {`,
				`\t\trequest: ${requestTypeName};`,
				`\t\tresponse: ${responseTypeName};`,
				`\t};`,
				`}`,
			].join("\n");

			scripts.push([pathComment, importLine, interfaceDef].join("\n"));
		}

		const moduleComment = [
			"//",
			`// Types for ${module.name}`,
			"//",
			"",
			`interface ${moduleInterfaceName} {}`,
		].join("\n");

		const scriptBody = scripts.join("\n\n");

		const interfaceDef =
			`interface Registry {\n\t${module.name}: ${moduleInterfaceName};\n}`;

		modules.push([moduleComment, scriptBody, interfaceDef].join("\n"));
	}

	const source = `${autoGenHeader()}${
		modules.join("\n\n\n\n")
	}\n\n${registryTypes.trim()}`;
	await Deno.mkdir(dirname(typedefPath), { recursive: true });
	await Deno.writeTextFile(typedefPath, source);
}

const registryTypes = `
export type RequestOf<T> = T extends { request: any } ? T["request"] : never;
export type ResponseOf<T> = T extends { response: any } ? T["response"] : never;

export type RegistryCallFn<ThisType> = <M extends keyof Registry & string, S extends keyof Registry[M] & string>(
	this: ThisType,
	module: M,
	script: S,
	req: RequestOf<Registry[M][S]>,
) => Promise<ResponseOf<Registry[M][S]>>;`;

export async function compileModuleTypeHelper(
	project: Project,
	module: Module,
) {
	const typedefPath = join(
		project.path,
		"_gen",
		"registry.d.ts",
	);

	let source = autoGenHeader();

	source += `import { Registry as FullRegistry } from "${typedefPath}";\n`;
	source += "export interface Registry {\n";
	source += `\t${module.name}: FullRegistry["${module.name}"];\n`;
	for (const dependencyName in module.config.dependencies) {
		source += `\t${dependencyName}: FullRegistry["${dependencyName}"];\n`;
	}
	source += "}\n";

	const helperPath = typeGenPath(project, module);
	await Deno.mkdir(dirname(helperPath), { recursive: true });
	await Deno.writeTextFile(helperPath, source);
}
