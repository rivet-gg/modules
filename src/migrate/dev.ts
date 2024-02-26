// Generates SQL migrations & generates client library.
//
// Wrapper around `prisma migrate dev`

import { copy, exists, join } from "../deps.ts";
import { buildPrismaPackage } from "./build_prisma_esm.ts";
import { Project } from "../project/mod.ts";
import { forEachPrismaSchema } from "./mod.ts";

export async function migrateDev(project: Project) {
	await forEachPrismaSchema(
		project,
		async ({ databaseUrl, module, tempDir, generatedClientDir }) => {
			const createOnly = Deno.args.includes("--create-only");

			// Generate migrations & client
			console.log("Generating migrations");
			const status = await new Deno.Command("deno", {
				args: [
					"run",
					"-A",
					"npm:prisma@5.9.1",
					"migrate",
					"dev",
					...(createOnly ? ["--create-only"] : []),
				],
				cwd: tempDir,
				stdin: "inherit",
				stdout: "inherit",
				stderr: "inherit",
				env: {
					DATABASE_URL: databaseUrl,
					PRISMA_CLIENT_FORCE_WASM: "true",
				},
			}).output();
			if (!status.success) {
				throw new Error("Failed to generate migrations");
			}

			if (!createOnly) {
				// Specify the path to the library & binary types
				await (async () => {
					for (
						const filename of [
							"index.d.ts",
							"default.d.ts",
							"wasm.d.ts",
							"edge.d.ts",
						]
					) {
						const filePath = join(generatedClientDir, filename);
						let content = await Deno.readTextFile(filePath);
						const replaceLineA =
							`import * as runtime from './runtime/library.js'`;
						const replaceLineB =
							`import * as runtime from './runtime/binary.js'`;
						content = content
							.replace(
								replaceLineA,
								`// @deno-types="./runtime/library.d.ts"\n${replaceLineA}`,
							)
							.replace(
								replaceLineB,
								`// @deno-types="./runtime/binary.d.ts"\n${replaceLineB}`,
							)
							.replace(/from '.\/default'/g, `from './default.d.ts'`);
						await Deno.writeTextFile(filePath, content);
					}
				})();

				// Compile the ESM library
				console.log("Compiling ESM library");
				buildPrismaPackage(
					generatedClientDir,
					join(generatedClientDir, "esm.js"),
				);
			}

			// Copy back migrations dir
			console.log("Copying migrations back");
			const tempMigrationsDir = join(tempDir, "migrations");
			const migrationsDir = join(module.path, "db", "migrations");
			if (await exists(tempMigrationsDir)) {
				await copy(tempMigrationsDir, migrationsDir, { overwrite: true });
			}
		},
	);
}
