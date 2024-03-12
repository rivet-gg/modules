import { resolve, stringify } from "../deps.ts";
import { Project } from "../project/mod.ts";

export async function templateScript(
	project: Project,
	moduleName: string,
	scriptName: string,
) {
	// if (!project.localRegistry) throw new Error("Local registry not configured");
	// const modulesPath = project.localRegistry.path;

	const mod = project.modules.get(moduleName);
	if (!mod) throw new Error(`Missing module ${moduleName}`);
	if (!("local" in mod.registry.config)) throw new Error(`Module ${moduleName} is not in a local registry`);
	if (mod.registry.isExternal) throw new Error(`Module ${moduleName} is in an external registry`);

	// Create scripts
	const scriptPath = resolve(
		mod.path,
		"scripts",
		scriptName + ".ts",
	);
	try {
		await Deno.stat(scriptPath);
		throw new Error("Script already exists");
	} catch (error) {
		if (!(error instanceof Deno.errors.NotFound)) {
			throw error;
		}
	}

	// Create test if doesn't already exist
	let createTest = false;
	const testPath = resolve(
		mod.path,
		"tests",
		scriptName + ".ts",
	);
	try {
		await Deno.stat(testPath);
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			createTest = true;
		} else {
			throw error;
		}
	}

	// Add script to config
	const newConfig = structuredClone(mod.config);
	newConfig.scripts[scriptName] = {};
	const newConfigRaw = stringify(newConfig);
	await Deno.writeTextFile(
		resolve(mod.path, "module.yaml"),
		newConfigRaw,
	);

	// Write default config
	const scriptTs = `import {
	RuntimeError,
	ScriptContext,
} from "../_gen/scripts/${scriptName}.ts";

export interface Request {
    
}

export interface Response {
    
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// TODO: Implement code for ${moduleName}/${scriptName}
    throw new Error("Unimplemented");
}

`;
	await Deno.writeTextFile(scriptPath, scriptTs);

	if (createTest) {
		// Write default config
		const testTs = `import { TestContext, test } from "../_gen/test.ts";
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

test("e2e", async (ctx: TestContext) => {
	const res = await ctx.call("${moduleName}", "${scriptName}", {
		// TODO:
	}) as any;
});

`;
		await Deno.writeTextFile(testPath, testTs);
	}
}
