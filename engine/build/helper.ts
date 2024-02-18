import { Module, Registry, Script, scriptDistHelperPath } from "../registry/mod.ts";
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
import { ScriptContext as ScriptContextInner, DrizzleSchema } from "@ogs/runtime";
import { users, identities, identityGuests } from "../../../modules/${module.name}/db/schema.ts"

interface ModuleDrizzleSchema extends DrizzleSchema {
	users: typeof users;
	identities: typeof identities;
	identityGuests: typeof identityGuests;
}

export type ScriptContext = ScriptContextInner<ModuleDrizzleSchema>;
`;

	// Write source
	const helperPath = scriptDistHelperPath(registry, module, script);
	await Deno.mkdir(path.dirname(helperPath), { recursive: true });
	await Deno.writeTextFile(helperPath, source);
}
