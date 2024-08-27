import { runDrizzleCommand } from "../drizzle.ts";
import { Module, Project } from "../project/mod.ts";
import { forEachDatabase } from "./mod.ts";

export async function migrateGenerate(
	project: Project,
	modules: Module[],
	signal?: AbortSignal,
) {
	await forEachDatabase(
		project,
		modules,
		async ({ module }) => {
			await runDrizzleCommand(project, module, {
				args: ["generate"],
				interactive: true,
				output: true,
				signal,
			});
		},
	);
}
