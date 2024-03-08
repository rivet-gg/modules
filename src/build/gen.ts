import { dedent } from "./deps.ts";
import { dirname, resolve } from "../deps.ts";
import { Module, moduleGenPath, Project, Script, scriptGenPath, testGenPath, typeGenPath } from "../project/mod.ts";
import { genRuntimeModPath } from "../project/project.ts";
import { autoGenHeader } from "./misc.ts";

export async function compileModuleHelper(
	project: Project,
	module: Module,
) {
	const runtimePath = genRuntimeModPath(project);

	// Generate source
	let dbImports = "";
	if (module.db) {
		dbImports = dedent`
			import prisma from "./prisma/esm.js";
			export { prisma };
			export const Prisma = prisma.Prisma;
		`;
	}

	const source = dedent`
		import { ModuleContext as ModuleContextInner } from "${runtimePath}";
		import { Registry as RegistryTypeInner } from "./registry.d.ts";
		
		${dbImports}
		
		/**
		 * Empty Request/Response type.
		 * 
		 * This only exists because of some quirks of empty interfaces in
		 * typescript that can be read more about here:
		 * https://www.totaltypescript.com/the-empty-object-type-in-typescript
		 */
		export type Empty = Record<string, never>;
		export { RuntimeError } from "${runtimePath}";
		export type ModuleContext = ModuleContextInner<RegistryTypeInner, ${
		module.db ? "prisma.PrismaClient" : "undefined"
	}>;
	`;

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

	const source = dedent`
		${autoGenHeader()}
		import * as module from "./mod.ts";
		import { Runtime, TestContext as TestContextInner } from "${runtimePath}";
		import { Registry as RegistryTypeInner } from "./registry.d.ts";
		import config from "${project.path}/_gen/runtime_config.ts";
		
		export * from "./mod.ts";
		
		export type TestContext = TestContextInner<RegistryTypeInner, ${
		module.db ? "module.prisma.PrismaClient" : "undefined"
	}>;
		
		export type TestFn = (ctx: TestContext) => Promise<void>;
		
		export function test(name: string, fn: TestFn) {
			Runtime.test(config, "${module.name}", name, fn);
		}
	`;

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

	const source = dedent`
		${autoGenHeader()}
		import * as module from "../mod.ts";
		import { ScriptContext as ScriptContextInner } from "${runtimePath}";
		import { Registry as RegistryTypeInner } from "../registry.d.ts";
		
		${module.db ? 'import { PrismaClient } from "../prisma/index.d.ts";' : ""}
		
		export * from "../mod.ts";
		
		export type ScriptContext = ScriptContextInner<RegistryTypeInner, ${
		module.db ? "module.prisma.PrismaClient" : "undefined"
	}>;
	`;

	// Write source
	const helperPath = scriptGenPath(project, module, script);
	await Deno.mkdir(dirname(helperPath), { recursive: true });
	await Deno.writeTextFile(helperPath, source);
}

export async function compileTypeHelpers(project: Project) {
	const typedefPath = resolve(
		project.path,
		"_gen",
		"registry.d.ts",
	);

	let moduleTypesSource = "";
	let moduleRegistrySource = "";
	for (const module of project.modules.values()) {
		let scriptImportsSource = "";
		let scriptInterfaceSource = "";
		for (const script of module.scripts.values()) {
			const scriptId = `${module.name}$$${script.name}`;

			const requestTypeName = `${scriptId}Req`;
			const responseTypeName = `${scriptId}Res`;

			const importPath = resolve(
				module.path,
				"scripts",
				`${script.name}.ts`,
			);

			scriptImportsSource += dedent`
				// ${module.name}/${script.name}
				import type { Request as ${requestTypeName}, Response as ${responseTypeName} } from ${
				JSON.stringify(importPath)
			};
			`;

			scriptInterfaceSource += dedent`
				${script.name}: {
					request: ${requestTypeName};
					response: ${responseTypeName};
				};
			`;
		}

		const moduleInterfaceName = `${module.name}$$Module`;
		moduleTypesSource += dedent`
			//
			// Types for ${module.name}
			//

			${scriptImportsSource}

			interface ${moduleInterfaceName} {
				${scriptInterfaceSource}
			}
		`;

		moduleRegistrySource += dedent`
			${module.name}: ${moduleInterfaceName};
		`;
	}

	const source = dedent`
		${autoGenHeader()}

		export type RequestOf<T> = T extends { request: any } ? T["request"] : never;
		export type ResponseOf<T> = T extends { response: any } ? T["response"] : never;

		export type RegistryCallFn<ThisType> = <M extends keyof Registry & string, S extends keyof Registry[M] & string>(
			this: ThisType,
			module: M,
			script: S,
			req: RequestOf<Registry[M][S]>,
		) => Promise<ResponseOf<Registry[M][S]>>;

		interface Registry {
			${moduleRegistrySource}
		}

		${moduleTypesSource}
	`;

	await Deno.mkdir(dirname(typedefPath), { recursive: true });
	await Deno.writeTextFile(typedefPath, source);
}

export async function compileModuleTypeHelper(
	project: Project,
	module: Module,
) {
	const typedefPath = resolve(
		project.path,
		"_gen",
		"registry.d.ts",
	);

	const moduleDependencies = Object.keys(module.config.dependencies || {})
		.map((dependencyName) => `${dependencyName}: FullRegistry["${dependencyName}"]`)
		.join(";\n\t");

	const source = dedent`
		${autoGenHeader()}
		import { Registry as FullRegistry } from "${typedefPath}";
		export interface Registry {
			${module.name}: FullRegistry["${module.name}"];
			${moduleDependencies}
		}
	`;

	const helperPath = typeGenPath(project, module);
	await Deno.mkdir(dirname(helperPath), { recursive: true });
	await Deno.writeTextFile(helperPath, source);
}
