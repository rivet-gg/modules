import { genAllPublicUtils, genModulePublicUtils, Project, publicPath } from "../../project/mod.ts";
import { GeneratedCodeBuilder } from "./mod.ts";
import { camelify } from "../../types/case_conversions.ts";
import { exists } from "../../deps.ts";

export async function compilePublicUtilsHelpers(project: Project) {
	const allPublicUtils = new GeneratedCodeBuilder(genAllPublicUtils(project));

	for (const module of project.modules.values()) {
		const reexporter = new GeneratedCodeBuilder(genModulePublicUtils(project, module), 2);

		// If it exists, reexport the `public.ts` file for this module
		if (await exists(publicPath(module), { isFile: true })) {
			reexporter.append`
				export * from ${JSON.stringify(reexporter.relative(publicPath(module)))};
			`;
		}

		// Export the module's name as a constant
		reexporter.append`export const __CANONICAL_MODULE_NAME = "${module.name}";`;

		await reexporter.write();
	}

	// Generate the `all.ts` file
	for (const module of project.modules.values()) {
		const importPath = allPublicUtils.relative(
			genModulePublicUtils(
				project,
				module,
			),
		);
		// Export the module's public utils under the module's name
		allPublicUtils.append`
			// Public utils for ${module.name}
			export * as ${camelify(module.name)} from ${JSON.stringify(importPath)};
		`;
	}

	await allPublicUtils.write();
}
