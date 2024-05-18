import { hasUserConfigSchema, Module } from "../../project/mod.ts";

export { GeneratedCodeBuilder } from "./code_builder.ts";

export { compileModuleHelper } from "./module.ts";
export { compileTestHelper } from "./test.ts";
export { compileScriptHelper } from "./script.ts";

export { compileModuleTypeHelper } from "./module_type.ts";
export { compileModulePublicUtilsHelper } from "./module_public_utils.ts";
export { compilePublicUtilsHelpers } from "./public_utils.ts";
export { compileTypeHelpers } from "./type.ts";

export async function getUserConfigImport(module: Module, moduleRoot: string) {
	let userConfigImport = "";
	let userConfigType = "Record<string, never>";
	if (await hasUserConfigSchema(module)) {
		userConfigImport = `import { Config as UserConfig } from "${moduleRoot}/config.ts";`;
		userConfigType = "UserConfig";
	}
	return { userConfigImport, userConfigType };
}
