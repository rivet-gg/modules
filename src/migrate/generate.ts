// Generates Prisma client libraries.
//
// Wrapper around `prisma generate`

import { copy, emptyDir, resolve } from "../deps.ts";
import { buildPrismaPackage } from "./build_prisma_esm.ts";
import { Module, Project } from "../project/mod.ts";
import { forEachDatabase } from "./mod.ts";
import { runPrismaCommand } from "./prisma.ts";
import { Runtime } from "../build/mod.ts";
import { genPrismaOutputFolder } from "../project/project.ts";
import { getPrismaDatabaseUrlWithSchema } from "../utils/db.ts";

export async function generateClient(
	project: Project,
	modules: Module[],
	runtime: Runtime,
	signal?: AbortSignal,
) {
	await forEachDatabase(
		project,
		modules,
		async ({ module }) => {
			const dbDir = await runPrismaCommand(project, module, {
				args: ["generate"],
				env: {
					DATABASE_URL: getPrismaDatabaseUrlWithSchema(module.db!.schema).toString(),
					PRISMA_CLIENT_FORCE_WASM: "true",
				},
				interactive: false,
				output: false,
				signal,
			});
			const clientDir = resolve(dbDir, "client");

			// Specify the Deno types ofr the JS imports.
			//
			// index.d.ts is type file referenced in the compiled esm.js file.
			const filePath = resolve(clientDir, "index.d.ts");
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
				.replace(/(import|export)\s+(.*)\s+from '.\/(default|index)'/g, `$1 type $2 from './$3.d.ts'`);
			await Deno.writeTextFile(filePath, content);

			// Compile the ESM library
			await buildPrismaPackage(
				clientDir,
				resolve(clientDir, "esm.js"),
				runtime,
			);

			// Copy to module
			const dstDir = genPrismaOutputFolder(project, module);
			await emptyDir(dstDir);
			await copy(clientDir, dstDir, { overwrite: true });
		},
	);
}
