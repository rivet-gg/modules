// deno task artifacts:build:runtime_archive
//
// Generates a JSON file with all of the runtime's source that can be used to re-populate the source

import { resolve } from "../deps.ts";
import { buildArtifacts, rootSrcPath } from "./util.ts";

await buildArtifacts(
	rootSrcPath(),
	[
		"src/{runtime,types,dynamic}/*.ts",
		"src/deps.ts",
		"src/utils/db.ts",
	],
	resolve(rootSrcPath(), "artifacts", "runtime_archive.json"),
);
