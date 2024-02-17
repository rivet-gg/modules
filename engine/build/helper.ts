import { Module, Registry, Script } from "../registry/mod.ts";
import * as path from "std/path/mod.ts";

export async function compileScriptHelpers(registry: Registry) {
	for (const module of registry.modules.values()) {
		for (const script of module.scripts.values()) {
			await compileScriptHelper(registry, module, script);
		}
	}
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

export type ScriptContext = ScriptContextInner;
`;

	// Write source
	const helperPath = script.distHelperPath(registry, module);
	await Deno.mkdir(path.dirname(helperPath), { recursive: true });
	await Deno.writeTextFile(helperPath, source);
}
