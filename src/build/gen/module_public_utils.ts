import { genAllPublicUtils, Module, Project, publicGenPath } from "../../project/mod.ts";
import { camelify } from "../../types/case_conversions.ts";
import { GeneratedCodeBuilder } from "./mod.ts";

export async function compileModulePublicUtilsHelper(
	project: Project,
	module: Module,
) {
	const reexport = new GeneratedCodeBuilder(publicGenPath(project, module));
	const utilsPath = reexport.relative(genAllPublicUtils(project));

	for (const dependency of Object.keys(module.config.dependencies || {})) {
		reexport.append`
			// Reexports public utils for ${dependency}
			export { ${camelify(dependency)} } from ${JSON.stringify(utilsPath)};
		`;
	}

	await reexport.write();
}
