import { runDrizzleCommand } from "../drizzle.ts";
import { Module, Project } from "../project/mod.ts";
import { forEachDatabase } from "./mod.ts";

export async function migrateApply(
	project: Project,
	modules: Module[],
	signal?: AbortSignal,
) {
	await forEachDatabase(
		project,
		modules,
		async ({ module }) => {
			await runDrizzleCommand(project, module, {
				args: ["migrate"],
				interactive: false,
				output: Deno.env.get("VERBOSE") == "1",
				signal,
			});
		},
	);
}
