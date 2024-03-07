// Generates SQL migrations & generates client library.
//
// Wrapper around `prisma migrate dev`

import { copy, exists, resolve } from "../deps.ts";
import { buildPrismaPackage } from "./build_prisma_esm.ts";
import { Module, Project } from "../project/mod.ts";
import { forEachPrismaSchema } from "./mod.ts";

export interface MigrateDevOpts {
	createOnly: boolean;
}

export async function migrateDev(
	project: Project,
	modules: Module[],
	opts: MigrateDevOpts,
) {
	await forEachPrismaSchema(
		project,
		modules,
		async ({ databaseUrl, module, tempDir, generatedClientDir }) => {
			// Generate migrations & client
			const status = await new Deno.Command("deno", {
				args: [
					"run",
					"-A",
					"npm:prisma@5.9.1",
					"migrate",
					"dev",
					...(opts.createOnly ? ["--create-only"] : []),
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

			if (!opts.createOnly) {
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
						const filePath = resolve(generatedClientDir, filename);
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
				buildPrismaPackage(
					generatedClientDir,
					resolve(generatedClientDir, "esm.js"),
				);
			}

			// Copy back migrations dir
			const tempMigrationsDir = resolve(tempDir, "migrations");
			const migrationsDir = resolve(module.path, "db", "migrations");
			if (await exists(tempMigrationsDir)) {
				await copy(tempMigrationsDir, migrationsDir, { overwrite: true });
			}
		},
	);
}

// export async function __TEMP__migrateDev(
// 	project: Project,
// 	module: Module,
// 	opts: MigrateDevOpts,
// ) {
// 	const databaseUrl = "postgres://username:password@localhost:5432/database";
// 	// Setup database
// 	const defaultDatabaseUrl = Deno.env.get("DATABASE_URL") ??
// 		"postgres://postgres:password@localhost:5432/postgres";

// 	// Create dirs
// 	const tempDir = await Deno.makeTempDir();
// 	const dbDir = resolve(module.path, "db");
// 	const generatedClientDir = resolve(
// 		module.path,
// 		"_gen",
// 		"prisma",
// 	);

// 	// Copy db
// 	await copy(dbDir, tempDir, { overwrite: true });

// 	// Generate migrations & client
// 	console.log("Generating migrations");
// 	const status = await new Deno.Command("deno", {
// 		args: [
// 			"run",
// 			"-A",
// 			"npm:prisma@5.9.1",
// 			"migrate",
// 			"dev",
// 			...(opts.createOnly ? ["--create-only"] : []),
// 		],
// 		cwd: tempDir,
// 		stdin: "inherit",
// 		stdout: "inherit",
// 		stderr: "inherit",
// 		env: {
// 			DATABASE_URL: databaseUrl,
// 			PRISMA_CLIENT_FORCE_WASM: "true",
// 		},
// 	}).output();
// 	if (!status.success) {
// 		throw new Error("Failed to generate migrations");
// 	}

// 	if (!opts.createOnly) {
// 		// Specify the path to the library & binary types
// 		await (async () => {
// 			for (
// 				const filename of [
// 					"index.d.ts",
// 					"default.d.ts",
// 					"wasm.d.ts",
// 					"edge.d.ts",
// 				]
// 			) {
// 				const filePath = resolve(generatedClientDir, filename);
// 				let content = await Deno.readTextFile(filePath);
// 				const replaceLineA = `import * as runtime from './runtime/library.js'`;
// 				const replaceLineB = `import * as runtime from './runtime/binary.js'`;
// 				content = content
// 					.replace(
// 						replaceLineA,
// 						`// @deno-types="./runtime/library.d.ts"\n${replaceLineA}`,
// 					)
// 					.replace(
// 						replaceLineB,
// 						`// @deno-types="./runtime/binary.d.ts"\n${replaceLineB}`,
// 					)
// 					.replace(/from '.\/default'/g, `from './default.d.ts'`);
// 				await Deno.writeTextFile(filePath, content);
// 			}
// 		})();

// 		// Compile the ESM library
// 		console.log("Compiling ESM library");
// 		buildPrismaPackage(
// 			generatedClientDir,
// 			resolve(generatedClientDir, "esm.js"),
// 		);
// 	}

// 	// Copy back migrations dir
// 	console.log("Copying migrations back");
// 	const tempMigrationsDir = resolve(tempDir, "migrations");
// 	const migrationsDir = resolve(module.path, "db", "migrations");
// 	if (await exists(tempMigrationsDir)) {
// 		await copy(tempMigrationsDir, migrationsDir, { overwrite: true });
// 	}
// }
