import { Registry } from '../registry/mod.ts';
import * as path from "std/path/mod.ts";
import { stringify } from "std/yaml/mod.ts";

const moduleName = Deno.args[0];
const scriptName = Deno.args[1];
if (!moduleName) throw new Error("Module name required");
if (!scriptName) throw new Error("Script name required");

const registry = await Registry.load();

const mod = registry.modules.get(moduleName);
if (!mod) {
    throw new Error(`Missing module ${moduleName}`);
}

// Create directires
const scriptPath = path.join(registry.path, "modules", moduleName, "scripts", scriptName + ".ts");
try {
	await Deno.stat(scriptPath);
	throw new Error("Script already exists");
} catch (error) {
	if (!(error instanceof Deno.errors.NotFound)) {
		throw error;
	}
}

// Add script to config
const newConfig = structuredClone(mod.config);
newConfig.scripts[scriptName] = {};
const newConfigRaw = stringify(newConfig);
await Deno.writeTextFile(path.join(registry.path, "modules", moduleName, "module.yaml"), newConfigRaw);

// Write default config
const scriptTs =
`import { ScriptContext } from "@ogs/runtime";

export interface Request {
    
}

export interface Response {
    
}

export async function handler(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", {});

    throw new Error("Unimplemented");
}

`;
await Deno.writeTextFile(scriptPath, scriptTs);
