import { BuildState, buildStep } from "../build_state/mod.ts";
import { CombinedError, ValidationError } from "../error/mod.ts";
import { Project } from "../project/mod.ts";
import { mainConfigPath } from "../project/module.ts";
import { convertSerializedSchemaToZod } from "./schema/mod.ts";

export function planProjectValidate(buildState: BuildState, project: Project) {
	buildStep(buildState, {
		id: `project.validate`,
		name: "Validate",
		description: "backend.json",
		condition: {
			files: [mainConfigPath(project)],
		},
		async build() {
			const errors: ValidationError[] = [];
			for (const module of project.modules.values()) {
				if (module.userConfigSchema) {
					const result = await convertSerializedSchemaToZod(module.userConfigSchema).safeParseAsync(
						module.userConfig,
					);

					if (!result.success) {
						errors.push(
							new ValidationError(`Invalid config for module "${module.name}".`, {
								validationError: result.error,
								path: mainConfigPath(project),
								info: { moduleName: module.name },
							}),
						);
					}
				}
			}
			if (errors.length > 0) {
				throw new CombinedError(errors);
			}
		},
	});
}
