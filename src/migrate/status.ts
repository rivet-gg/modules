// Generates SQL migrations & generates client library.
//
// Wrapper around `prisma migrate dev`

import { Project } from "../project/mod.ts";
import { forEachPrismaSchema } from "./mod.ts";

export async function migrateStatus(project: Project) {
	await forEachPrismaSchema(project, [...project.modules.values()], async ({ databaseUrl, tempDir }) => {
		// Generate migrations & client
		console.log("Generating migrations");
		const status = await new Deno.Command("deno", {
			args: ["run", "-A", "npm:prisma@5.9.1", "migrate", "status"],
			cwd: tempDir,
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
			env: {
				DATABASE_URL: databaseUrl,
			},
		}).output();
		if (!status.success) {
			throw new Error("Failed to generate migrations");
		}
	});
}
