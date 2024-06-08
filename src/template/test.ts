import { UserError } from "../error/mod.ts";
import { resolve } from "../deps.ts";
import { getLocalRegistry, Project } from "../project/mod.ts";

export async function templateTest(
	project: Project,
	moduleName: string,
	testName: string,
) {
	if (!getLocalRegistry(project)) throw new UserError("No \`local\` registry found in backend.json.");

	const mod = project.modules.get(moduleName);
	if (!mod) throw new UserError(`Module \`${moduleName}\` does not exist.`);
	if (!("local" in mod.registry.config)) {
		throw new UserError(`Module \`${moduleName}\` does not belong to a local registry.`);
	}
	if (mod.registry.isExternal) throw new UserError(`Module \`${moduleName}\` must not be in an external registry.`);

	// Create test
	const testPath = resolve(
		mod.path,
		"tests",
		testName + ".ts",
	);
	try {
		await Deno.stat(testPath);
		throw new UserError(`Test \`${testName}\` already exists in module \`${moduleName}\`.`);
	} catch (error) {
		if (!(error instanceof Deno.errors.NotFound)) {
			throw error;
		}
	}

	// Write default test
	const testTs = `import { test, TestContext } from "../module.gen.ts";
import { assert, assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";

test("${testName}", async (ctx: TestContext) => {
	throw new Error("Unimplemented");
});
`;
	await Deno.writeTextFile(testPath, testTs);
}
