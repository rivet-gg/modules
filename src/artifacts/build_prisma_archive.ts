// deno task artifacts:build:prisma_archive
//
// Generates a JSON file with the node_modules folder used for Prisma so we don't have to depend on Node/NPM to install Prisma.

import { resolve } from "../deps.ts";
import { buildArtifacts, rootSrcPath } from "./util.ts";

// Install Prisma modules
const npmInstallOutput = await new Deno.Command("npm", {
	args: ["ci"],
	stdout: "inherit",
	stderr: "inherit",
	cwd: resolve(rootSrcPath(), "vendor", "prisma"),
}).output();
if (!npmInstallOutput.success) throw "Failed to install Prisma dependencies";

// Archive Prisma modules
await buildArtifacts({
	rootPath: resolve(rootSrcPath(), "vendor", "prisma", "node_modules"),
	patterns: [
		// Source files
		"**/*.{js,json,d.ts}",
		// Only include WASM files we depend on
		"prisma/build/prisma_schema_build_bg.wasm",
		"@prisma/client/runtime/query_engine_bg.postgresql.wasm",
	],
	outputPath: resolve(rootSrcPath(), "artifacts", "prisma_archive.json"),
	globOpts: {
		// Exclude large files we don't use
		ignore: ["prisma/build/index.js"],
	},
	encode: "base64",
});
