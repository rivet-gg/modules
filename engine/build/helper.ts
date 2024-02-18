import { Module, Registry, Script, scriptDistHelperPath } from "../registry/mod.ts";
import * as path from "std/path/mod.ts";
import { testDistHelperPath } from "../registry/registry.ts";

const COMMON_IMPORTS = `
import { RuntimeError } from "@ogs/runtime";
export { RuntimeError };
`;

export async function compileScriptHelpers(registry: Registry) {
	for (const module of registry.modules.values()) {
		await compileTestHelper(registry, module);

		for (const script of module.scripts.values()) {
			await compileScriptHelper(registry, module, script);
		}
	}
}

async function compileTestHelper(
	registry: Registry,
	module: Module,
) {
	console.log("Generating test", module.path);

	// Generate source
	const source = `
import { TestContext as TestContextInner, Runtime } from "@ogs/runtime";
${module.db ? `import { PrismaClient } from "../../prisma/${module.name}/index.d.ts";` : ""}
import config from "../../../dist/runtime_config.ts";

${COMMON_IMPORTS}

export type TestContext = TestContextInner<${module.db ? "PrismaClient" : "undefined"}>;

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
import { ScriptContext as ScriptContextInner } from "@ogs/runtime";
${module.db ? `import { PrismaClient } from "../../../prisma/${module.name}/index.d.ts";` : ""}

${COMMON_IMPORTS}

export type ScriptContext = ScriptContextInner<${module.db ? "PrismaClient" : "undefined"}>;
`;

	// Write source
	const helperPath = scriptDistHelperPath(registry, module, script);
	await Deno.mkdir(path.dirname(helperPath), { recursive: true });
	await Deno.writeTextFile(helperPath, source);
}
