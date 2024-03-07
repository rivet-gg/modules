// Generates Prisma client libraries.
//
// Wrapper around `prisma generate`

import { resolve } from "../deps.ts";
import { buildPrismaPackage } from "./build_prisma_esm.ts";
import { Module, Project } from "../project/mod.ts";
import { forEachPrismaSchema } from "./mod.ts";

export async function generateClient(
	project: Project,
	modules: Module[],
) {
	await forEachPrismaSchema(
		project,
		modules,
		async ({ databaseUrl, tempDir, generatedClientDir }) => {
			// Generate migrations & client
			const status = await new Deno.Command("deno", {
				args: [
					"run",
					"-A",
					"npm:prisma@5.9.1",
					"generate",
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

			// Specify the path to the library & binary types
			for (
				const filename of [
					"index.d.ts",
					"default.d.ts",
					"wasm.d.ts",
					"edge.d.ts",
				]
			) {
				const filePath = resolve(generatedClientDir, filename);
				let content = await Deno.readTextFile(filePath);
				const replaceLineA = `import * as runtime from './runtime/library.js'`;
				const replaceLineB = `import * as runtime from './runtime/binary.js'`;
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

			// Compile the ESM library
			await buildPrismaPackage(
				generatedClientDir,
				resolve(generatedClientDir, "esm.js"),
			);
		},
	);
}
