// deno task artifacts:build:runtime_archive
//
// Generates a JSON file with all of the runtime's source that can be used to re-populate the source

import { resolve } from "@std/path";
import { buildArtifacts, projectRoot} from "./util.ts";

await buildArtifacts({
	rootPath: projectRoot(),
	patterns: [
		"packages/{runtime,case_conversion,path_resolver}/**/*.ts",
	],
	outputPath: resolve(projectRoot(), "artifacts", "runtime_archive.json"),
	encode: "string",
});
