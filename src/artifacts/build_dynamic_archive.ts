// deno task artifacts:build:runtime_archive
//
// Generates a JSON file with all of the files that need to be accessed dynamically.

import { resolve } from "../deps.ts";
import { buildArtifacts, rootSrcPath } from "./util.ts";

await buildArtifacts(
	resolve(rootSrcPath(), "src", "dynamic"),
	["*.ts"],
	resolve(rootSrcPath(), "artifacts", "dynamic_archive.json"),
);
