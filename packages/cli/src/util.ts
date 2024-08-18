import { EnumType } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { MigrateMode } from "../../toolchain/src/build/mod.ts";
import { Project } from "../../toolchain/src/project/mod.ts";
import { UnreachableError, UserError } from "../../toolchain/src/error/mod.ts";

export const migrateMode = new EnumType(["dev", "generate", "generate-and-apply", "apply"]);

export function convertMigrateMode(migrateMode: string): MigrateMode {
	if (migrateMode == "dev") {
		return MigrateMode.Dev;
	} else if (migrateMode == "generate") {
		return MigrateMode.Generate;
	} else if (migrateMode == "generate-and-apply") {
		return MigrateMode.GenerateAndApply;
	} else if (migrateMode == "apply") {
		return MigrateMode.Apply;
	} else {
		throw new UnreachableError(migrateMode as never);
	}
}

export function resolveModules(project: Project, moduleNames: string[]) {
	if (moduleNames.length > 0) {
		return moduleNames.map((name) => {
			const module = project.modules.get(name);
			if (!module) throw new UserError(`Module not found: ${name}`);
			return module;
		});
	} else {
		return Array.from(project.modules.values());
	}
}
