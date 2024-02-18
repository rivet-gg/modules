import {
	Module,
	Registry,
	Script,
	scriptDistHelperPath,
} from "../registry/mod.ts";
import * as path from "std/path/mod.ts";
import {
	moduleDistHelperPath,
	testDistHelperPath,
} from "../registry/registry.ts";

export async function compileScriptHelpers(registry: Registry) {
	for (const module of registry.modules.values()) {
		await compileModuleHelper(registry, module);
		await compileTestHelper(registry, module);

		for (const script of module.scripts.values()) {
			await compileScriptHelper(registry, module, script);
		}
	}
}

async function compileModuleHelper(
	registry: Registry,
	module: Module,
) {
	console.log("Generating module", module.path);

	// Generate source
	const source = `
import { ModuleContext as ModuleContextInner } from "@ogs/runtime";
${
		module.db
			? `
import prisma from "../../prisma/${module.name}/esm.js";
export { prisma };
export const Prisma = prisma.Prisma;
`
			: ""
	}

export { RuntimeError } from "@ogs/runtime";

export type ModuleContext = ModuleContextInner<${
		module.db ? "prisma.PrismaClient" : "undefined"
	}>;
`;

	// Write source
	const helperPath = moduleDistHelperPath(registry, module);
	await Deno.mkdir(path.dirname(helperPath), { recursive: true });
	await Deno.writeTextFile(helperPath, source);
}

async function compileTestHelper(
	registry: Registry,
	module: Module,
) {
	console.log("Generating test", module.path);

	// Generate source
	const source = `
import * as module from "./mod.ts";
import { Runtime, TestContext as TestContextInner } from "@ogs/runtime";
import config from "../../../dist/runtime_config.ts";

export * from "./mod.ts";

export type TestContext = TestContextInner<${
		module.db ? "module.prisma.PrismaClient" : "undefined"
	}>;

export type TestFn = (ctx: TestContext) => Promise<void>;

export function test(name: string, fn: TestFn) {
	Runtime.test(config, "${module.name}", name, fn);
}
`;

	// Write source
	const helperPath = testDistHelperPath(registry, module);
	await Deno.mkdir(path.dirname(helperPath), { recursive: true });
	await Deno.writeTextFile(helperPath, source);
}

async function compileScriptHelper(
	registry: Registry,
	module: Module,
	script: Script,
) {
	console.log("Generating script", script.path);

	// Generate source
	const source = `
import * as module from "../mod.ts";
import { ScriptContext as ScriptContextInner } from "@ogs/runtime";
${
		module.db
			? `import { PrismaClient } from "../../../prisma/${module.name}/index.d.ts";`
			: ""
	}

export * from "../mod.ts";

export type ScriptContext = ScriptContextInner<${
		module.db ? "module.prisma.PrismaClient" : "undefined"
	}>;
`;

	// Write source
	const helperPath = scriptDistHelperPath(registry, module, script);
	await Deno.mkdir(path.dirname(helperPath), { recursive: true });
	await Deno.writeTextFile(helperPath, source);
}
