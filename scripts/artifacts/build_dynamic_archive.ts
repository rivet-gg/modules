// deno task artifacts:build:runtime_archive
//
// Generates a JSON file with all of the files that need to be accessed dynamically.

import { resolve } from "@std/path";
import { buildArtifacts, projectRoot } from "./util.ts";

await buildArtifacts({
	rootPath: resolve(projectRoot(), "dynamic"),
	patterns: ["**/*.{ts,gd,cfg}"],
	outputPath: resolve(projectRoot(), "artifacts", "dynamic_archive.json"),
	encode: "string",
});
