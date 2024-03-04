// Wrapper around `prisma migrate deploy`

import { Project } from "../project/mod.ts";
import { forEachPrismaSchema } from "./mod.ts";

export async function migrateDeploy(project: Project) {
	await forEachPrismaSchema(project, [...project.modules.values()], async ({ databaseUrl, tempDir }) => {
		// Generate migrations & client
		const status = await new Deno.Command("deno", {
			args: ["run", "-A", "npm:prisma@5.9.1", "migrate", "deploy"],
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
