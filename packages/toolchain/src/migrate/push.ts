import { Module, Project } from "../project/mod.ts";
import { forEachDatabase } from "./mod.ts";
import { runDrizzleCommand } from "../drizzle.ts";

export async function migratePush(
	project: Project,
	modules: Module[],
	signal?: AbortSignal,
) {
	await forEachDatabase(
		project,
		modules,
		async ({ module }) => {
			await runDrizzleCommand(project, module, {
				args: ["push"],
				interactive: true,
				output: true,
				signal,
			});
		},
	);
}
